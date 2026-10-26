# Stage 2 — Real WebXR world tracking

Implementation completed in the existing `D:\GateVisualizer` project. **Physical-device behavior: UNVERIFIED.** No real Android phone or browser automation environment was available; no claim of tested AR tracking is made.

## Scope and behavior

Start AR requests a real native immersive-ar session directly from its click, requiring `local` and optionally requesting `local-floor`, hit testing, anchors and DOM overlay. The renderer enables Three.js XR and uses its XR animation loop. All scene, viewer, hit and anchor transforms use the selected local-floor/local reference space. The orange cube is a world-scene child, not camera-parented. Missing/emulated position suppresses placement/rendered markers. Native reference-space reset clears placement and asks for a rescan.

Hit-test placement uses a fresh current-frame pose. If hit-test initialization is unavailable, a tap copies a single 1.5 m forward viewer-relative position into world coordinates, with explicit no-surface-alignment messaging. Anchor creation is attempted inside the active frame; unavailable or rejected anchors retain session-scoped world placement. Late anchors are deleted after reset/end; anchor pose loss hides the marker. This is not persistent world mapping across sessions.

Optional DOM overlay provides diagnostics/place/reset/exit only when Chrome reports it active. Native XR select supports place/reset without overlay; Chrome's native UI handles exit. All physical acceptance labels remain UNVERIFIED. No MediaDevices stream, camera simulation, gate fitting, entrance detection, photo mode or catalogue was added.

## Files

Created:

- `src/xr/rendering.ts`: transparent XR renderer and disposable marker/reticle scene; dynamically imported after session request.
- `src/xr/useXRSession.ts`: React event bridge, refs and unmount cleanup.
- `src/xr/session.test.ts`: mocked platform tests with real Three.js transforms.
- `STAGE2_REPORT.md`: this report.

Modified:

- `src/xr/session.ts`: replaced Stage 1 policy stub with the real session lifecycle controller.
- `src/App.tsx`: Stage 2 instructions, diagnostics, overlay root, reset/exit/place actions and renderer host.
- `src/ui/CapabilityPanel.tsx`: gesture-driven Start AR enabled only after supported detection and outside an active session.
- `src/capabilities/detect.ts`: support message now describes session launch and unverified hardware behavior.
- `src/App.test.tsx`: supported launches only on click; unsupported stays disabled; permission errors.
- `src/styles.css`: controls and optional native-overlay styling.
- `README.md`: current behavior, exact Android acceptance checklist and deployment/HTTPS configuration.

Preserved: package/lockfile/dependencies, strict tooling, original gate PNG and provenance, gate asset metadata, static preview, gate-plane module, capability tests, and historical Stage 1 report. No dependency installation or unrelated feature changes were necessary.

## Commands and validation

Inspected project files/dependencies, the existing WebXR typings, and Three.js WebXRManager implementation using `rg`, `Get-Content`, and directory listing. Consulted the primary Three.js and Immersive Web specifications linked in README.md. No packages were added.

| Command | Final result |
| --- | --- |
| `npm run typecheck` | PASS: strict TypeScript |
| `npm run lint` | PASS: zero errors/warnings |
| `npm test` | PASS: 3 files, 32 tests |
| `npm run build` | PASS: Vite production build, no build warnings |
| `npm exec vite -- preview --host 127.0.0.1 --port 4173` plus `Invoke-WebRequest` | PASS: production page, PNG, CSS, app JS and deferred renderer JS all HTTP 200 with correct MIME types; preview server stopped afterward |

Test coverage includes: immediate single-session request; optional features; denied permissions; local-floor to local fallback; no-overlay selection; hit-test fallback; fixed placement under changing viewer poses; fresh-hit requirement; emulated/missing pose rejection; tracking recovery; anchor pose and fallback; late-anchor/source cancellation; reset; native end; in-flight renderer exit; setup failure; unmount; rejected end retry; rejected end during disposal; pagehide; context loss; restart; overlay select suppression and visibility pause.

An initial lint issue from returning refs together with state was fixed by destructuring the hook result. The initial build's CSS optimizer warnings for the experimental :xr-overlay pseudo-class were eliminated by styling an attribute set only after native DOM overlay is granted. Dynamic renderer import removed the large single-chunk warning while preserving requestSession before any asynchronous work.

Production output: HTML 0.54 kB; CSS 11.69 kB; app/common JS 411.74 kB (121.43 kB gzip); deferred renderer JS 352.77 kB (84.97 kB gzip). Native/WebGL boundaries are mocked in tests; no automated test proves Chrome's spatial tracking or rendered output.

## Cleanup and remaining limits

Session end removes application listeners, cancels hit-test sources, deletes anchors, stops animation, removes the canvas, disposes geometries/materials/renderer and loses the owned WebGL context. Three.js first handles native end so it can detach XR render targets before resource disposal. In-flight initialization defers renderer disposal until attachment settles. Stale asynchronous sources/anchors are cancelled/deleted. If native session.end rejects, normal UI exit retains a retry handle; unmount still releases application resources and the browser owns final native XR teardown. Page closure cannot guarantee completion of asynchronous platform calls.

Hardware acceptance must verify native session startup, real camera compositing, surface recognition, actual marker stability/drift, anchor behavior, no-overlay native taps, Chrome lifecycle, and repeated session cleanup. Unsupported optional branches can be marked NOT EXERCISED on a device; they have mocked test coverage, not hardware validation. Marker placement is session-scoped. No cross-session persistence, gate fitting or real entrance detection exists.

## Android and deployment handoff

Use the exact numbered checklist in README.md. The main acceptance criterion is an orange marker staying at a recognizable physical point while moving about 1 m sideways and 0.5 m nearer/farther; record drift and console errors. Record phone/OS/Chrome/AR services versions and every optional feature branch actually exercised.

Deploy `dist/` to trusted HTTPS at the configured Vite base path, preferably in a top-level Chrome tab. Allow `xr-spatial-tracking` in Permissions-Policy. README.md includes the exact header, an Nginx example and the USB-forwarded localhost development alternative. No deployment was requested or performed. Stop here at Stage 2 until the user confirms physical results.
