# GateVisualizer — Stage 6

An architectural, mobile-first customer website around the real React/Vite/Three.js WebXR engine. Stage 6 adds seven customer routes, a genuine perspective-correct photo compositor, locally saved previews and a complete customer journey. The verified XR session/tracking engine, measured calibration, fitting/appearance, diagnostic marker and geometric photo detection are preserved. No backend, account, paid API or cross-session XR anchor persistence is introduced.

**Want your uploaded gate in the live camera?** Open `#/live`, upload your gate using the first panel, enter measurements, press **Start AR — open live camera**, then capture the left and right pillar bases. You do not need a house photograph. See **[MOBILE_AR_SETUP.md](MOBILE_AR_SETUP.md)** for the exact Android connection steps. Run `npm run dev:mobile` for a fixed development port; real mobile AR still needs trusted HTTPS or USB-forwarded phone localhost, not the ordinary LAN HTTP link.

## Stage 6 customer website

Routes use URL fragments, so refresh and static hosting do not need seven server routes:

| Route | Experience |
| --- | --- |
| `#/home` | Architectural homepage, exact requested headline, device-aware primary Live/Photo action |
| `#/live` | Existing real immersive-ar experience, calibration and advanced controls |
| `#/catalogue` | Modern, Minimal, Horizontal Slat, Vertical Slat, Laser Cut, Classic and Luxury |
| `#/upload` | Shared PNG/JPG/WebP gate upload and links into both preview modes |
| `#/photo` | Photo capture/upload, detection/manual correction, real homography composition, comparison/export/save |
| `#/saved` | Local preview thumbnails, reopen, rename, export and explicit deletion |
| `#/help` | Current compatibility, permissions, privacy/storage, calibration, realism and image credits |

The ivory/charcoal design uses local system/serif fonts, restrained motion with reduced-motion support, keyboard focus/skip links, responsive navigation and native-overlay safe areas. Architecture photography is self-hosted under the documented Unsplash license. It is explicitly an inspiration image, not an app output/client project. All seven gate designs are original **illustrative placeholders**, not vendor products; see ASSET_LICENSES.md.

### Actual photo composition

House images are decoded with orientation and resized to at most **1600 px on the longest side**. Gate rasters used by photo composition are bounded to 2048 px; the Live engine retains its existing image limits. OpenCV detection receives a separate maximum-960 px input and remains a geometric suggestion, not semantic recognition.

Four labeled points define a projective homography from a rectangular opening coordinate system to the photograph. The compositor inverts that matrix per destination pixel, applies the selected Fit/Crop/Proportional layout, size and offsets, bilinearly samples the gate with premultiplied-alpha interpolation, adjusts brightness and composites over the real photo. Heavy work runs in a cancellable Web Worker; updates are debounced and stale results ignored. Singular/horizon-crossing or invalid geometry fails clearly, without a default rectangle.

Before shows the original processed house photograph; After shows the actual composite. Hide guides offers a clean review. Export downloads that same generated PNG **with the house and gate**, without editor guides. Save/export are unavailable for incomplete/invalid corners, pending renders, detection or loading. This is a 2D visual study; layout dimensions/points do not establish physical depth, a 3D plane/anchor, shadows or foreground occlusion.

### IndexedDB and ownership

Saving stores the photo blob, embedded selected gate blob, composite, normalized corners, name, timestamps and settings together in IndexedDB (`gatevisualizer-local`, version 1). Transactions complete before success is shown. Reopen decodes the embedded gate, restores the photo/settings and recomposes; it does not create an XR session. Rename/delete use transactions and storage errors offer retry or export guidance.

An unsaved draft remains while navigating within the tab; standalone unsaved gate uploads are tab-local until included in a saved photo project. Browser data clearing, private browsing, quota limits and eviction can remove/block saved previews. There is no cloud or cross-device copy. Exports are the user's durable backup. Root navigation is guarded while AR is requesting/active/ending, so photo capture does not race a native immersive camera session.

### Validation and manual journey

Run the commands below. The added `fake-indexeddb` package is **development-only**, for persistence integration tests. `scripts/browser-qa.mjs` is an additional real-browser QA driver: it expects the production preview at port 4173 and a dedicated, isolated Chrome DevTools endpoint at port 9337, and writes ignored artifacts to `.browser-qa/`. Run it only with an isolated profile, never a personal browser endpoint. This session verified actual desktop Chrome workers, Canvas PNG output and IndexedDB, with mobile viewport emulation. Physical Android camera/AR and other browsers still require acceptance.

See **[STAGE6_ACCEPTANCE.md](STAGE6_ACCEPTANCE.md)** for the complete 24-step customer journey covering all pages, unsupported devices, uploads, photo correction/export, persistence, permissions, AR preservation, accessibility and cleanup. See **STAGE6_REPORT.md** for exact results and scope. Prior stage reports/checklists below remain historical/technical context.

## Commands

Use Node 24+ and npm. Dependencies are locked in `package-lock.json`.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Production static output is `dist/`. Stage 4 adds `@techstark/opencv-js` and Node test typings, locked in package-lock.json. `npm run dev -- --host 0.0.0.0` serves LAN HTTP only; it does not supply HTTPS. Do not expose Vite's development server to the public internet.

## Stage 5 fitting and live preview

No new dependencies are needed. Calibrate with the existing measured width/height and two real XR pillar-base hits, then use the two control panels in the optional native DOM overlay:

- **Fit** (default): contains the complete image within the scaled opening, preserves aspect, bottom-aligns it and centers it horizontally. Top/sides can remain empty.
- **Crop**: makes the vertical plane exactly the scaled measured width × height. Texture UVs trim the image instead of stretching it. Horizontal cropping is centered; vertical cropping is bottom-aligned, so the top can be trimmed. Inspect decorative details before accepting a crop.
- **Proportional**: uses scaled measured width and derives height from image aspect. No crop/stretch occurs; the resulting height may exceed the opening. The panel reports actual plane dimensions to three decimals.
- **Fine placement**: use 0.01 m X/Z/base-height inputs, 0.1° yaw increments, measured width/height and uniform scale. Along gate ±1 cm nudges use the placed plane's horizontal world direction; Raise/Lower ±1 cm use world up. Neither follows the phone. Scale 1 retains measured sizing. Lock protects fitting mode and spatial edits; appearance, design switching and comparison remain available.
- **Appearance**: brightness, contrast, opacity and manual lighting exposure (−2 to +2 EV). RGB adjustments use a linear-light contrast pivot of 0.18, then brightness × 2^EV; texture alpha is retained and multiplied by opacity. These are artistic image controls, not measured scene lighting. No real shadows or gate thickness are generated.
- **Catalogue**: choose one of three clearly marked original local PNG placeholders, or retain/upload your own image. Switching waits for successful decode, disposes the old texture, and preserves native anchor/world position, measurements, offsets, fitting, appearance and lock. Different aspect ratios follow the selected fitting mode. Edit `src/gates/assets.ts` to register licensed product artwork; actual decoded dimensions determine fitting. `node scripts/generate-catalogue.mjs` regenerates only the supplied gate-02/gate-03 placeholders and will overwrite those two files.
- **Before/after**: after placement in gate mode, Show before hides only the world gate; Show after restores it at the same placement. Native passthrough and XR tracking continue. This needs the active immersive view and native DOM overlay controls; the diagnostic cube and separate-photo editor are not given a fake AR comparison. New sessions/Reposition start in After. Tracking loss still hides content regardless of comparison mode.
- **Recovery**: small native world-anchor corrections can be filtered with an 80 ms time constant. This does not filter the camera. Manual edits, new placement, tracking recovery and reference-space resets clear the filter. Position corrections over 0.5 m or rotations over 30° snap instead of drifting slowly through the scene; recapture if alignment is wrong. Smoothing is optional. Native reference reset still clears spatial calibration and unlocks placement.
- **Reset/Reposition**: Reset also restores neutral appearance, Fit, scale 1 and After, together with the prior estimated metric defaults. Reposition retains dimensions/scale/appearance/design while clearing spatial samples and offsets and returning to After. Exit and resource cleanup remain owned by the existing session controller.

Transparent artwork padding is part of the pixel rectangle in every mode; use tightly cropped front-elevation gate art. Crop does not detect alpha boundaries or create material outside the image. No fitting mode can recover physically correct dimensions from an unmeasured image alone.

## Capture and realism support

| Feature | Current status |
| --- | --- |
| Metric upright 2D world plane, fit/crop/proportional, manual appearance | Implemented; new Android/GPU behavior unverified |
| Before/after with unchanged world placement | Implemented for placed gate in immersive AR with DOM overlay; device acceptance needed |
| Gate-only PNG export | Browser Canvas 2D/toBlob; up to 1024 px longest side, selected fit/crop and manual appearance, alpha retained |
| XR passthrough screenshot/export | Unavailable in this app; raw camera/compositor capture has not been verified |
| Android screenshot/screen recording | Explicit external fallback if Chrome/OS permit it; inspect whether protected camera content is included |
| Foreground occlusion | OFF: no verified real depth/segmentation source; photo quads/hit-test planes are not used as masks |
| Physically accurate shadows, measured environment lighting, reflections, 3D thickness | Unsupported; no fake geometry or scene-light claims |

Export gate-only PNG prepares a front-elevation **asset**, not a screenshot of the live environment or camera viewpoint. It reads the already-permitted decoded image with Canvas 2D, applies the UV crop and color adjustments, and offers a user-clicked download link. It never reads the XR framebuffer, compositor or camera and opens no additional stream. Re-export after changing designs/settings; the prepared file records settings at export time. Canvas buffers are released after encoding; object URLs are revoked on replacement/unmount. Browser color/resampling and small alpha-test edge differences can vary from the GPU. No environment screenshot is silently replaced by this asset.

## Performance profiling and Stage 5 Android acceptance

Session diagnostics show the last rolling XR callback sample: average callback fps, p95 callback interval, average application CPU frame work (including renderer submission), draw calls and renderer geometry/texture counts. Measurements update at most once per second over a maximum 120-frame window. Pauses reset timing history. These are **not GPU timings, total browser memory bytes, camera fps or benchmark guarantees**. After exit, the last sample can remain visible for review.

1. On trusted HTTPS in Chrome on the target ARCore Android phone, perform the retained spatial calibration below. Check both pillars and the gate base from at least two positions. Use scale 1 and real measurements.
2. Test wide and tall artwork in all three fitting modes. Check reported metric dimensions, unchanged proportions, Crop's bottom alignment, fine ±1 cm movements and yaw. Transparent spaces must show the real environment; no thickness/shadows should appear.
3. Lock placement and switch through all catalogue items and an upload. Check that pose, offsets, fitting, appearance and lock are preserved. Test a failed image load; the previous design must remain. Unlock to change fitting or spatial controls.
4. Adjust brightness/contrast/exposure/opacity. Confirm changes affect the gate only, not the real environment. Test neutral defaults and opacity 0/1. Inspect GPU shader/alpha edges; this has not been physically tested here.
5. Toggle Before/After while standing still, then while moving. Only the gate should disappear/reappear. Walk sideways/nearer/farther to confirm world stability. Test smoothing on/off, tracking interruption/recovery and native recalibration/reset; use Reposition when the native world frame no longer aligns.
6. Export a gate-only PNG and inspect the actual downloaded file: correct aspect/crop/orientation, appearance and transparency, **no camera environment**. Attempt Android's system screenshot only if permitted; record whether passthrough is included. Do not claim in-app AR screenshot support from that OS result.
7. Profile after a 10-second warm-up, standing/moving for at least 30 seconds. Record actual native callback intervals, p95, CPU time, draw calls and resource counts. Typical 60/90 Hz callback budgets are 16.7/11.1 ms, but the app does not promise either rate. Switch catalogue designs at least ten times and repeat before/after; resource counts should stabilize rather than increase per switch. Internal XR resources can affect counts, so compare against that session's baseline instead of asserting fixed totals.
8. Repeat start/place/switch/exit three times, including Chrome's native exit and a context-loss/recovery scenario where practical. Use remote DevTools to check resource cleanup and errors. GPU/device timings, screenshot support, occlusion and calibration drift remain hardware acceptance items, not conclusions from unit tests.

The renderer reuses a unit gate plane/material; fitting changes scale/UVs and appearance changes uniforms rather than adding geometry or offscreen passes. Only the active gate texture is held by the XR scene. Flat double-sided artwork uses one render pass, with no fake 3D extrusions. Exit disposes textures/materials/geometries, stops animation and releases the renderer/context. Profiling and world-pose filtering do not depend on or modify the camera trajectory.

## Camera-frame finding and selected workflow

The first inspection found that the existing immersive session requests local space, hit tests, anchors and DOM overlay, **not `camera-access`**. It never exposes camera pixels to OpenCV. No Android/ADB bridge or target browser was available in the implementation environment, so usable raw pixel access on the target phone could not be tested. This is **UNVERIFIED**, not a claim that the phone cannot support the optional API.

The raw-camera specification requires a separately enabled camera feature and frame-scoped camera texture handling. XR support, a viewer pose, passthrough rendering, `XRView.camera` metadata, or a texture handle alone does not establish that this application has successfully read pixels for OpenCV. The actual session diagnostics now report enabled-feature/metadata observations, while keeping pixel-readback status unverified. No raw-frame analysis is enabled. See the [WebXR Raw Camera Access specification](https://immersive-web.github.io/raw-camera-access/).

Accordingly Stage 4 uses **a separate photo captured/selected before AR**, through the platform file/camera picker. No getUserMedia stream is opened, and photo capture/editing is disabled while XR is requesting/active/ending. Start AR is disabled while photo processing is running. There is no simultaneous camera workaround. If you later verify permission, frame-scoped GPU sampling/readback, pixel orientation and processing on the target device, live analysis can be considered separately; no such test is claimed here.

## Stage 4 Android workflow and acceptance

1. Before starting AR, choose Take/select an entrance photo. Android may open its rear-camera picker or offer an existing photo. Include the complete inner opening, nearly head-on, in good light. Use the same physical entrance and the same side later in AR; avoid mirrored photos. JPG/PNG/WebP up to 20 MB is accepted. Decode orientation is applied, then the image is reduced to a maximum 960 px side for bounded local processing.
2. Wait for OpenCV.js to initialize in its dedicated worker. First use loads the self-hosted approximately **13.3 MB** JS/embedded-WASM asset; it is not part of the initial page JS. The worker is terminated on result, error, cancellation, timeout (45 seconds) or unmount. Cancel processing if needed; manual selection remains available. There is no expensive main-thread fallback.
3. The pipeline converts to grayscale, measures brightness/contrast, equalizes contrast, blurs, runs Canny edges, contour approximation/convexity and Hough line detection, computes line intersections, validates quadrilaterals, checks edge support, deduplicates and ranks up to five proposals. It uses no trained model. Proposals may be windows, walls or other rectangles, not actual entrances. Hough line combinations are limited to mostly upright/horizontal boundaries; severe perspective, missing top/bottom edges, curved gates, occlusion and sloping sites may fail.
4. Inspect each unconfirmed proposal. The menu reports a **heuristic score out of 100, capped at 95**, based on edge support, area and corner angles. It is not a calibrated probability or a semantic recognition confidence. Do not treat a high score as evidence that the region is a gate opening.
5. Correct the four labeled handles: **top-left, top-right, bottom-right, bottom-left**. Handles are 44 CSS px. Drag on the photo, select a corner, use its 3× resized-pixel magnifier and 5 px nudge buttons. Any edit becomes a manual correction, clears confirmation and receives no automatic confidence. Alternatively choose Mark four corners manually / clear and tap the actual four points in that order. No default rectangle is inserted or called a detection.
6. Low-light/low-contrast, clutter, no supported quadrilateral, invalid geometry, worker failure or timeout must show an explanation. Retake with better light/framing, simplify clutter, or mark the actual opening manually. The detector does not prove that no entrance exists. Confirmation remains disabled for incomplete, overlapping/crossed, near-degenerate, out-of-photo, too-small/large or extreme-aspect geometry.
7. Enter **tape-measured opening width and intended gate height**, in metres. Image aspect ratio does not produce those measurements. Tap Confirm boundaries & measured dimensions only after inspecting the proposal/correction. This saves normalized TL/TR/BR/BL coordinates for guidance, selects gate mode, and copies your measured envelope with scale 1/zero offsets into the existing calibration controls. Confirmation neither requests an XR session nor creates an anchor.
8. Start AR at that same entrance. Match the confirmed photo's **BL** to the physical **left inner pillar base**, and **BR** to the physical **right base**, and capture both using fresh real XR hit tests as in the Stage 3 checklist below. Those spatial points establish position/yaw; world up establishes vertical and the tape measurements establish size. The pre-AR photo has no registered pose/extrinsics relative to the new XR session. Top photo points are a boundary-review reference, not automatic world coordinates. A 2D homography alone cannot establish calibrated depth or a 3D anchor.
9. Adjust X/Z, height and yaw while viewing both pillars and from the side; compare XR span against tape width, then lock. With no XR hit testing, the existing fixed-distance fallback is still only approximate and needs manual depth alignment. Do not describe photo confirmation plus that fallback as spatially calibrated. Reset restores estimated sizing; reconfirm/apply measured dimensions before relying on them again.
10. Verify the new workflow on Android: a clear frontal opening; a window/other rectangular distractor; several competing rectangles; a dark photo; a blank/no-opening photo; clutter; manually crossed/duplicate corners; drag/magnifier precision; worker cancellation; malformed photo; permission/policy failures; and capture disabled during AR. Confirm the world-tracked gate still remains fixed during movement and that lock/replacement/reset/exit retain Stage 3 behavior. Record actual enabled features and XR camera-frame diagnostics, never assuming they prove pixel readback.

No representative entrance dataset was supplied. Current evidence is synthetic geometry/pixel tests plus the existing XR test suite, not semantic accuracy evaluation. Universal gate recognition is not claimed. Distinguishing gates from windows/walls and handling varied structures reliably would require labeled real-world data, negative examples, lighting/occlusion/perspective coverage and held-out evaluation; any future trained model must be explicitly introduced and evaluated, not silently substituted.

## AR behavior

The following Stage 2 session, pose, anchor, fallback and cleanup behaviors are retained. Cube-specific tap/reset instructions apply to **Stage 2 diagnostic marker**, selectable before starting. Gate mode uses two sequential captures, keeps placement on subsequent view taps, and provides explicit Reposition/Reset/Lock controls. Gate rendering is a Three.js texture on a metric plane, not an HTML camera overlay.

- Start AR calls `navigator.xr.requestSession('immersive-ar', …)` synchronously from its click handler. A positive capability check alone does not prove a session can start.
- `local` is required. `local-floor`, `hit-test`, `anchors`, and `dom-overlay` are optional. Prefer a floor reference space, falling back to `local`. The renderer, hit poses, marker transforms, and anchor poses share the selected space.
- Three.js enables XR, binds the XRSession, and uses `setAnimationLoop` with native XR frames. Three.js updates the XR camera's per-view pose and projection; the marker is a child of the scene, never of the camera.
- A viewer-space hit-test ray aims along the center of the view. A teal ring shows a current surface hit. Tap the XR view or Place marker to place the orange cube. No current hit means placement waits for scanning; it does not silently use a stale hit.
- If the hit-test API/source cannot be initialized, placement is a one-time transform 1.5 m along the viewer's forward direction in the selected world space. This fallback does not claim surface alignment, floor height, or entrance detection.
- Try an anchor during the placement frame. If unavailable/rejected, keep the original world-space transform for this session. A located anchor updates from its native pose; an unlocatable anchor hides the cube. No placement persists across sessions.
- Missing/emulated positional poses and hidden sessions suppress content/placement. Recovery restores the same world placement. Reference-space reset clears placement and requests a rescan rather than showing an incorrect location.
- Tap again after diagnostic-marker placement to reset. With DOM overlay, Reset and Exit AR are available alongside diagnostics. Without overlay, use native XR taps for place/reset and Chrome's native XR exit. The scrollable overlay card occupies at most 48% of the viewport height, leaving the center aiming ray clear; diagnostics and detailed controls are collapsible.
- Exit, native session end, pagehide, unmount, initialization failures, and WebGL context loss trigger lifecycle cleanup. Pending anchors and hit-test sources are discarded if they resolve after reset/end. No MediaDevices camera stream is requested; Chrome/WebXR owns AR camera access.

## Required deployment configuration

Deploy only the built `dist/` files to a static host. Serve the document, JS, CSS and PNG over trusted HTTPS. Configure `base` in `vite.config.ts` before building if serving from a subdirectory. The default is the origin root.

Ship **all** hashed assets, including the detection worker and OpenCV JS/embedded WASM, with JavaScript MIME types. They are same-origin; there is no CDN runtime dependency. Enable compression/caching for the large OpenCV asset. If you use a Content-Security-Policy, it must permit same-origin module/worker loading (`script-src 'self' 'wasm-unsafe-eval'` and `worker-src 'self'`), blob image previews (`img-src 'self' blob:`), and the app's inline style attributes for corner positions. WASM compilation may be blocked without `wasm-unsafe-eval`; an error then offers manual marking, not an invented detection. No SharedArrayBuffer or cross-origin-isolation headers are required by this single-threaded worker build. Attribution/license are in `THIRD_PARTY_NOTICES.md` and `/third-party/opencv-LICENSE.txt`.

The phone must trust the certificate. Plain `http://<LAN-IP>:5173` is not sufficient, and bypassing a certificate warning is not a reliable secure-context setup. Prefer a top-level Chrome tab. Avoid a restrictive `xr-spatial-tracking` Permissions-Policy inherited from the host or a parent page. Recommended response header:

```http
Permissions-Policy: xr-spatial-tracking=(self)
```

Example Nginx HTTPS virtual host (replace paths/domain and use a certificate trusted by the phone):

```nginx
server {
    listen 443 ssl;
    server_name gates.example.com;
    ssl_certificate /etc/letsencrypt/live/gates.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gates.example.com/privkey.pem;
    root /srv/gatevisualizer/dist;
    index index.html;
    add_header Permissions-Policy "xr-spatial-tracking=(self)" always;
    location / { try_files $uri $uri/ /index.html; }
}
```

An HTTP virtual host should redirect to the HTTPS origin. On a managed static host, set the equivalent response header in that host's configuration and enable its trusted TLS certificate. No deployment was performed here. If embedding is unavoidable, both the parent's Permissions-Policy and iframe `allow="xr-spatial-tracking"` must permit the app's origin; test top-level first.

Development alternative: USB-debug the phone, open desktop Chrome `chrome://inspect/#devices`, enable port forwarding from device port 5173 to `localhost:5173` on the desktop, run `npm run dev`, and open `http://localhost:5173` on the **phone**. Forwarded localhost qualifies as a secure context. Confirm `window.isSecureContext === true` in the device's remote console. This is a development route, not a production deployment.

## Exact Android gate calibration — retained Stage 3 workflow

1. **Prepare the image and measurements.** Use a front-facing gate elevation, cropped tightly to its outer edges, with transparent spaces between bars. `/gates/gate-01.png` is an explicitly marked local placeholder copied from the Stage 1 asset; replace it with your own appropriately licensed artwork for a real design. PNG/WebP alpha is preserved; JPG remains opaque. No background removal is performed. Uploads are decoded locally and never sent to a service. Accepted formats: PNG/JPG/WebP, up to 10 MB, maximum 4096 pixels per side.
2. **Measure the entrance with a tape.** Measure the clear width between the inner pillar faces, and the intended gate height from the chosen bottom level. In Gate calibration & image, enter Entrance width and Gate height in metres. Defaults **3.00 × 1.80 m are estimates**, not detected dimensions. Keep scale at **1.00** for measurement-based sizing. Commit a number with Enter or by leaving its field; invalid/out-of-range input reverts.
3. **Understand aspect fitting.** In default Fit mode, the image is contained within that measured width/height envelope with its original aspect ratio, bottom-aligned and centered horizontally. There is no stretching or cropping in that mode. Stage 5 also offers Crop and Proportional modes as described above. The controls show actual rendered width × height. Transparent padding counts as part of the image size. The sample's padding prevents treating its visible bars as exact plane edges.
4. **Launch on Android.** Open trusted HTTPS in Chrome on an ARCore-certified Android 12+ phone with Google Play Services for AR. Select **2D gate calibration**, then Start AR. Accept native XR permissions. Do not start any other camera stream. If DOM overlay is unavailable, native taps can capture bases, but live numeric adjustments, replacement and locking are unavailable; exit with Chrome's XR control and use a browser/device supporting overlay for the complete alignment workflow.
5. **Capture the LEFT pillar base.** Stand outside facing the entrance with both pillars visible. Scan the textured ground slowly in good light. Aim the center-view teal ring at the ground where the left inner pillar edge meets the intended bottom level. Tap the view outside controls or Capture left base. The status must change to Capture right pillar base. This stores a real depth-bearing XR hit, not a point on a photograph.
6. **Capture the RIGHT pillar base.** Aim the ring at the corresponding right inner pillar base at the same level and capture again. Points must be 0.2–20 m apart horizontally and no more than 25 cm apart vertically. The horizontal line through both points establishes the gate's direction; world +Y establishes vertical; the left point establishes initial base height. The gate is centered between the two hits. A floor hit alone does not infer a full vertical entrance plane. Compare the reported approximate XR span with your tape width; if they differ substantially, use Reposition and recapture. The XR span does not overwrite your measurements.
7. **Align while viewing the live entrance.** Open Gate calibration & image. Change **World X** and **World Z / depth** in small increments (start with 0.05 m); these use fixed XR axes, not camera-relative axes. Reverse the sign if a test adjustment goes the wrong way. Change **Base height offset** to raise/lower the gate, and **Vertical-axis rotation** to align its plane through both pillars. Rotation is around the bottom center; the plane remains upright. Width/height set the measured envelope, and scale changes both image dimensions uniformly. Avoid changing scale away from 1 unless you deliberately want to override measured sizing.
8. **Check depth from a second viewpoint.** Walk safely sideways and a little nearer/farther while keeping the entrance in view. Compare both gate edges with the inner pillar edges and its base with the ground. Adjust Z/X/yaw/height until alignment holds from both viewpoints, not just one camera angle. Four image-space corners alone are never used to infer real-world depth here. There is no automatic entrance detection or occlusion by real pillars.
9. **Lock Placement.** Tap Lock Placement when satisfied. Numeric controls, Reposition and native view taps are then protected; tracking continues. Unlock Placement restores adjustments. The explicit Reset action can still clear a locked placement. Locking prevents accidental editing; it is not a guarantee against ARCore drift or tracking loss.
10. **Replace the design without replacing the calibration.** Upload PNG/JPG/WebP or Load gate-01 sample from the same panel. The current anchor/world transform, measured envelope, offsets, rotation and lock remain unchanged. A different image aspect changes the fitted visual width/height within the envelope. The old texture is disposed; a decode failure retains the previous gate. Android's file picker may hide/end the native session: recovery or a fresh session depends on Chrome; if the session ends, recalibrate in the new session. This hardware interaction is unverified.
11. **Tracking loss and reset.** If positional tracking is missing/emulated or the session is hidden, the gate hides and status reports loss/limited/paused. It reappears at its stored world placement when valid tracking returns. An unavailable anchor pose also hides it. A native reference-space reset clears placement and unlocks it; recapture both bases. **Reposition** clears the anchor/base samples and X/Z/height/yaw offsets, retaining the image, measured envelope and scale. **Reset** clears placement and restores estimated 3 × 1.8 m / scale 1 / zero offsets; the chosen image remains. Exit AR releases the session and rendering resources.
12. **No-hit-test fallback.** Only when hit-test source initialization is unavailable, a capture places an approximate upright plane 1.5 m ahead at the current viewer height, facing that initial viewpoint. Its yaw/position are copied once and do not follow later camera motion. Use a negative base-height offset to lower it (eye height is not measured automatically), then manually adjust world X/Z/yaw and verify both pillars from the side. This fallback is explicitly **not depth-calibrated**, floor-aligned or automatically fitted. Prefer two real hit points whenever available.

For acceptance, record device/Chrome/Android/AR services versions, URL, measured dimensions, actual fitted size, XR span, anchor/overlay/hit-test support, drift during movement, texture top/bottom orientation and alpha appearance, lock/reset/replacement behavior, and remote-console errors. Test asymmetric artwork to verify orientation. Repeat with a tall or square upload to verify no aspect distortion; test a bad file to confirm the previous gate remains. Mark unavailable hardware branches NOT EXERCISED. No Stage 3 physical test is claimed by the automated results.

## Stage 2 diagnostic acceptance checklist (retained)

Select **Stage 2 diagnostic marker** before Start AR to exercise the preserved test cube and original lifecycle checks below. These checks do not establish Stage 3 gate calibration accuracy.

Record phone model, Android version, Chrome version, Google Play Services for AR version, URL, date, and screenshots/video plus console errors. Mark each item PASS / FAIL / NOT EXERCISED. Do not mark tracking verified from unit tests or a supported capability result.

1. Use an ARCore-certified Android 12+ phone with current Chrome and Google Play Services for AR installed/enabled. Open the top-level HTTPS URL in Chrome, not an in-app browser. Stand in a safe, well-lit area facing a textured floor/table; avoid reflective, blank, or dark surfaces.
2. Confirm the secure context, capability `supported`, Start AR enabled, session `idle`, and UNVERIFIED label. Loading/rechecking must not open a camera/session prompt.
3. Tap Start AR once and accept Chrome's permissions. Confirm native immersive AR opens with the real environment, session becomes `running`, reference space is `local-floor` or `local`, and tracking reports a native positional pose. No second camera permission/stream should start. Repeated start taps must not create a second session.
4. Move the phone slowly sideways and tilt toward the surface for 5–15 seconds. If hit testing initializes, confirm hit status changes from scanning to Surface found and a teal ring appears at the center ray's surface intersection. Before a current hit, a tap must not place a surface marker.
5. Aim the ring at a recognizable physical point and tap the XR view outside overlay buttons, or tap Place marker. Confirm an orange cube appears about 15 cm wide, placement reads Placed on surface, and the aiming ring hides. Record anchor status: tracking anchor, unavailable, or creation failed/world-space fallback.
6. Keep the cube in view. Move approximately 1 m left, 1 m right, then 0.5 m nearer and farther; rotate the phone while remaining safe. The cube should stay at the original physical point and change perspective/size naturally. It must not remain fixed to screen coordinates or follow the phone. Record visible drift/jumps and approximate displacement. This is the key physical tracking acceptance step.
7. Briefly point away/cover the view, then return. If positional tracking is lost, confirm the marker hides and status reports loss/limited tracking; recovery should restore its original location. If the device never reports loss, mark this branch NOT EXERCISED. Background Chrome and return; check visibility pause/recovery or a clean native session end.
8. Tap Reset placement (or tap the XR view once after placement). Confirm the cube disappears; place again at a different point. If a reference-space reset occurs, placement must clear and request a rescan. Mark that branch NOT EXERCISED if no native reset occurs.
9. If the device lacks hit testing or source creation fails, confirm the explicit fixed-distance message. Tap once and verify placement is 1.5 m ahead at that instant; repeat step 6. Do not treat it as a surface placement. If the device supports hit testing, mark this optional fallback branch NOT EXERCISED on hardware; automated tests cover it.
10. If anchors are unsupported/rejected, confirm session-scoped world-space placement still works through step 6. If anchors are active, confirm anchor tracking status and world stability. Record the branch actually exercised; the other remains NOT EXERCISED.
11. With DOM overlay, confirm diagnostics plus Place/Reset/Exit buttons work and button clicks do not also trigger XR placement/reset. On a device without overlay, native taps must still place/reset and Chrome's XR exit must work. Record overlay support; do not require the optional overlay for success.
12. Tap Exit AR. Confirm native AR closes, status becomes `ended`, the canvas is removed, and the camera indicator stops after Chrome releases AR. Start/exit three times, including one exit using Chrome's native XR control. Check remote console for uncaught errors, abandoned frames, or context/resource warnings. Rotate the phone in one session to check the native XR viewport.
13. Deny XR permission on a fresh request and confirm a clear permission/policy error without a lingering session. Restore permissions and retry. Test an unsupported browser/device and plain LAN HTTP separately: clear unsupported/unavailable/insecure messages, disabled Start AR, and no fake AR view.

If no-overlay operation is exercised, diagnostics are reviewed after exiting; Chrome controls own immersive entry/exit UI. If Chrome rejects `session.end()`, the app retains the handle and offers retry; use Chrome's native exit if necessary. Page-close cleanup is best-effort, with final XR teardown owned by the browser.

## Structure and tests

- `src/capabilities/`: injected-environment WebXR/secure-context support checks.
- `src/xr/session.ts`: XR lifecycle, reference spaces, native frame poses, hit tests, placement, anchors and cleanup.
- `src/xr/rendering.ts`: transparent Three.js renderer, disposable gate texture/plane, diagnostic cube and reticle.
- `src/xr/useXRSession.ts`: React bridge and unmount handling; no automatic session launch.
- `src/geometry/`: bottom-centered upright plane, aspect fitting, two-point spatial basis and world adjustments.
- `src/gates/`: asset metadata, validated local image loading/replacement and object-URL ownership.
- `src/preview/`: selected image preview, separate from the XR world-space gate.
- `src/ui/`: capability and launch controls; app diagnostics also serve as the optional DOM overlay.
- `public/gates/` and `scripts/generate-placeholder.mjs`: retained original local placeholder and provenance.

Vitest includes the retained XR/OpenCV/fitting tests plus Stage 6 homography/alpha composition, IndexedDB lifecycle and customer-route integration tests. The real Chrome QA driver additionally exercises worker execution, export and save/reload/reopen/delete. Physical Android still requires the customer journey checklist. See STAGE6_REPORT.md for current results; earlier reports are historical evidence.

No semantic entrance recognizer, automatic 3D gate fitting, AR photo-export mode, catalogue, 3D gate model, paid service, or persistent anchors are implemented. Geometric photo proposals assist user-guided, session-scoped world alignment.

References: [Google WebXR requirements](https://developers.google.com/ar/develop/webxr/requirements), [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html), [WebXR hit testing](https://immersive-web.github.io/hit-test/), [WebXR anchors](https://immersive-web.github.io/anchors/), [DOM overlays](https://immersive-web.github.io/dom-overlays/).
#   g a t e - v i s u a l i z e r  
 