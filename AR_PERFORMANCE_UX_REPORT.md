# Live AR latency and customer controls

Date: 27 October 2026. Existing React/Vite/TypeScript/Three.js/WebXR stack retained. No Android hardware measurements were collected. Samsung M34 camera clarity, native tracking and physical FPS remain **UNVERIFIED**.

## Findings from the existing code

| Finding | Evidence and significance | Change |
| --- | --- | --- |
| Reticle geometry already used current native poses | `reticle.matrix.fromArray(hitPose.transform.matrix)` ran inside `setAnimationLoop`. No reticle lerp, damping, CSS transition or timer existed. The existing 80 ms filter applies to placed world-anchor corrections, not the reticle. | Preserve direct frame-by-frame reticle updates. No claimed removal of nonexistent reticle smoothing. |
| Readiness could be stale for 150 ms | `lastHitReport` throttled the surface status while the actual reticle could already be hidden. This was a real app-induced feedback/placement-button defect, not proof of native pose latency. | Remove that throttle. Invalidate readiness immediately on a missed hit, tracking/visibility loss, reset and lock. Placement rechecks the actual capture frame. |
| Only the first hit result was examined | A null `getPose()` for the first hit discarded other valid results in the same frame/reference space. | Try up to four ordered native results and use the first valid, non-emulated pose. Never invent or retain an invalid ready pose. |
| Surface acquisition started after GL setup | Viewer/source setup waited for renderer import and XR layer attachment. | Start the single hit-test subscription while renderer initialization proceeds. Cache it for the session and cancel it on teardown or late completion. |
| Avoidable frame-loop allocations/checks | Repeated `Object.entries` status comparisons, repeated camera-capability checks, and production profiling ran during normal frames. | Compare status fields without allocating entry arrays; publish only changed state. Check fixed camera capability at setup. Remove all profiling timers/buffers/work from normal production sessions. |
| Gate replacement could block JS | Large images were synchronously canvas-resized when applied to the XR scene; every replacement also invalidated the material program. | Prefer asynchronous browser `createImageBitmap` resize, max 2048 px, with explicit orientation/alpha handling. Keep the prior texture until replacement is ready. Invalidate the material only when adding its first map. Close/dispose replaced and late resources. |
| Heavy customer settings were present in the live view | Multiple nested calibration/debug controls, two-base capture required for every user, and offscreen photo tooling could rerender with XR state. | Default to upright single-point preview/placement. Mount advanced controls only when Fine Tune is open; unmount photo detection entirely during XR. Keep accurate two-pillar calibration available. |
| Several good settings already existed | Cached source, same XR reference space for renderer/hits/anchors, pixel ratio 1, framebuffer scale 0.75, no MSAA, unlit 2D material, no shadows/postprocessing, workers for OpenCV, and world-space transforms after placement. | Preserve them rather than claim they were newly removed/fixed. No speculative new performance preset was added without device measurements. |

If the native frame has no localizable pose/hit, the app cannot manufacture a surface. Native plane acquisition, texture/lighting, motion blur, thermal throttling, camera/ARCore behavior, compositor/GPU work and supported reference spaces still affect responsiveness. A surface reticle follows the intersection geometry, not the screen centre or a fixed image coordinate.

## Applied implementation

- Reticle and simple gate preview use the latest valid `XRFrame` poses directly; no position goes through React, timers or smoothing. Invalid tracking hides the reticle while retaining its last matrix internally, so it never jumps to an invented origin. New valid geometry snaps directly to the measured point.
- Reuse Matrix4/Vector3 scratch objects for the continuous preview. Retain existing cached Quaternion/Vector3/Matrix4 filtering for placed anchor corrections. Placement-only allocations are outside the steady per-frame path.
- A single-point preview starts upright, facing the initial viewer direction at the current measured surface point. **Place Gate** commits that transform and locks it. Later camera movement/hits never drive the placed gate. Unlocking in Fine Tune resumes a separate hit-test reticle without moving that gate.
- Single-point placement supplies ground position and an initial orientation; it does not recognize the entrance plane or infer full entrance dimensions. Defaults remain estimates. Fine Tune retains measured dimensions, rotation, height/depth, nudges and the precise two-pillar workflow. Confirmed pre-AR photo geometry automatically selects that precise workflow.
- **Select Gate** works after starting the camera. **Change Gate** preserves placement/lock. **Reset** clears placement and resumes scanning while preserving the image and selected measurements. One Size slider is visible before placement. Raw coordinates and independent advanced controls are hidden by default.
- Full-screen immersive AR remains native WebXR. Optional DOM overlay has a small top status/Close control and safe-area-aware floating bottom controls, including landscape layout. Without DOM overlay, native taps/browser exit remain available; use pre-session Fine Tune to choose artwork/settings if needed.
- An XRSystem ownership lease covers permission/setup and native session lifetime, including asynchronous teardown. It prevents concurrent controllers from starting competing sessions. App-owned session/source counts track actual native end/source cancellation, not just visible React state.
- Large texture preparation has a generation guard. Superseded/disposed bitmap results close immediately. Original uploaded files/HTML images remain available for photo fallback and exports. Browsers without bitmap resize use a bounded canvas fallback outside the XR frame callback; that fallback can still briefly block JS during an image change.
- Gate readiness is distinct from surface readiness, preventing placement before texture preparation is complete.
- Repeated requests for the same image share its pending resize; the new async pipeline cannot leave preparation stuck after a duplicate request. Locked placement skips reading hit results but retains its cached native source for prompt reset/unlock.
- Closing optional photo preparation during processing now clears its busy flag, avoiding a stuck Start button.

## Development diagnostics

Fine Tune → **Developer performance** exists only in development. It reports approximately once per second:

- XR callback interval, approximate FPS and p95 interval;
- JavaScript frame processing/submission time (not GPU completion, React commits or end-to-end camera latency);
- hit success fraction among queried frames and reticle transform updates/second;
- app-owned active XR sessions/hit-test sources;
- Three.js draw calls and texture count when available.

The profiler uses fixed-size typed-array buffers and aggregates/sorts only for periodic reports. Production sessions allocate no profiler buffers and perform no `performance.now()`/profiling work in the XR callback. Actual readiness changes may still update the minimal React controls; steady pose changes do not. A regression drives 120 changing hit poses with zero additional React status publications once ready (diagnostics disabled).

Counts concern this application's owned resources, not other browser tabs or ARCore's internal resources. A failed native `end()` remains owned until the browser actually ends it; application GPU cleanup does not pretend the native session disappeared.

## Files changed

- `src/xr/session.ts`, `useXRSession.ts`, `rendering.ts`, `profiling.ts`; new `src/xr/resources.ts`.
- `src/LivePreview.tsx`, `src/ui/CapabilityPanel.tsx`, `PlacementGuide.tsx`; new `src/ui/XRDiagnostics.tsx`; `src/styles.css`.
- `src/detection/OpeningDetection.tsx`, `src/site/Help.tsx`.
- Updated controller, profiling, rendering, guide, photo-calibration integration and manual-fallback tests. Added `src/xr/resources.test.ts` and `src/ui/LiveCustomerControls.test.tsx`.
- Updated `scripts/simple-ui-qa.mjs`; added `scripts/xr-rendering-qa.mjs`.

No dependencies, assets, backend or paid APIs were added. Photo mode and live picture mode remain separate; the immersive XR engine never opens a `getUserMedia` stream or runs OpenCV.

## Verification results

- `git diff --check`: no whitespace errors (Git reports normal Windows LF/CRLF normalization information).
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`: passed; **35 files, 163 tests**.
- Controller regressions cover current-frame reticle changes, immediate missed-hit readiness invalidation, trying another valid hit pose, one cached source, stable-frame zero React publications, simple/precise placement, tracking loss/recovery, native session ownership, repeated start/end, cleanup and gate replacement.
- Rendering regressions cover async resize orientation, material-program reuse, stale bitmap disposal, alpha/aspect handling and texture replacement.
- `node scripts/browser-qa.mjs`: actual desktop Chrome/mobile viewport passed real OpenCV worker execution, honest failed detection, manual corners, perspective compositing, before/after, IndexedDB save/rename/reload/reopen/delete and actual image export.
- `node scripts/xr-rendering-qa.mjs`: actual **non-XR software-WebGL** browser check passed resized image orientation and alpha. After repeated switching: **one live gate texture, one draw call**. After disposal: **zero gate textures**. Production UI had no developer diagnostics. These are concrete resource/rendering checks, not Android performance measurements.

There is no controlled physical-device before/after FPS or latency result. The removed 150 ms status delay is established from code/regression behavior, not a measured camera-to-display improvement. GPU upload, initial shader compilation and native AR acquisition still cost time.

## Run and deploy

Use Node 24, npm and the existing project root:

```text
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Dependency installation was not repeated for this change because installed dependencies were present and unchanged. Build output is `dist`. Hostinger: project root `.`, npm, build `npm run build`, output `dist`, Node 24, no new environment variables. Deploy the complete output and open `https://YOUR-DOMAIN/#/live`; reload to receive the new hashed assets. HTTPS is required; any custom policy must permit same-origin `xr-spatial-tracking`. Optional DOM overlay and anchors remain browser-dependent. No backend is required.

For phone diagnostics run `npm run dev:mobile` behind a **trusted HTTPS development proxy/tunnel** forwarding to port 5173. Add only that host to Vite's allowlist if required; in PowerShell:

```powershell
$env:__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = 'your-controlled-dev-host.example'
npm run dev:mobile
```

Open the HTTPS development host on the phone, then Fine Tune → Developer performance. Production `dist` intentionally has no developer panel. A plain `http://192.168...` link cannot enable immersive AR. USB-forwarded phone localhost remains another development option, not a production requirement.

## Exact Android Chrome acceptance procedure

1. Use the target Android 12+ phone with ARCore support, current Chrome and Google Play Services for AR. Record phone/Chrome versions and test conditions. Start cool and in good light; use a textured entrance ground area.
2. Open the HTTPS `/#/live` route. Tap **Start Live Preview**, grant XR permission, then **Select Gate** and choose a transparent PNG. Verify no second camera permission/stream is requested by the immersive engine.
3. Point at the ground in the middle of the entrance, about 1–3 m away. Move slowly left/right and tilt slightly. Observe the ring against the real surface: it should use each valid hit, not remain screen-fixed. Before a valid hit, status must be **Finding Surface** and Place Gate disabled. Missing hits must never retain Ready to Place.
4. With **Ready to Place**, check the upright gate preview. Adjust the single **Size** slider, or open Fine Tune for rotation/alignment. Tap **Place Gate**. Verify **Gate Placed**, then walk sideways/closer: the gate must stay at its committed world location, not follow the aim point or camera.
5. **Change Gate** at least three times, including a large transparent image and a portrait image. Verify location, measurements and lock remain unchanged, orientation/alpha stay correct and failures retain the previous artwork. **Reset** should resume scanning with the selected gate retained.
6. For accurate fitting, Reset, open Fine Tune and choose **Precise — left and right pillar bases**. Enter tape measurements, capture the two real bases at the same ground level, verify alignment from the side and lock adjustments. The simple point must not be presented as an automatic entrance-depth solution.
7. Briefly cover the camera/point at a blank area to interrupt tracking, then restore the scene. Invalid reticle/gate poses must hide without moving to a fabricated point. Recovery must retain the committed placement; reset/recalibrate if the native map has shifted.
8. Test portrait/landscape and safe areas. Close, restart and place at least five times. Test permission denial and native/browser exit. In the development panel, running ownership should remain one session/one source, return to zero after actual exit, and not grow with repetition. A lost native `end()` should offer retry/native exit rather than permit a competing session.
9. In development, record 10–20 seconds each for scanning, ready preview and placed walking. Record frame interval/FPS, JS time, hit success, reticle Hz and texture counts, including gate changes. Low hit success can indicate native surface acquisition; high JS submission cost warrants investigation; low JS cost does not by itself rule out GPU, compositor, thermal or other-thread work. Compare only against a controlled earlier build under matching conditions.
10. Recheck Photo Preview: upload entrance/gate, correct corners, compare/export/save/reopen. Live Picture remains a separate 2D matching workflow, not an XR tracking substitute.

## Runtime references

- [W3C WebXR Hit Test](https://www.w3.org/TR/webxr-hit-test-1/): hit results and poses are frame/reference-space scoped.
- [Three.js WebXRManager](https://archive.threejs.org/docs/api/en/renderers/webxr/WebXRManager.html): framebuffer scale is configured before presentation; foveation is runtime-dependent.
- [Vite server options](https://v8.vite.dev/config/server-options): explicit development host allowlisting.
