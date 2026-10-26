# Stage 4 — Photo-based opening proposals

Work continues in the existing `D:\GateVisualizer` project. The user's verified Stage 3 XR engine and gate calibration remain in place. New Stage 4 device/browser behavior is **UNVERIFIED** pending Android acceptance.

## Critical first finding: immersive camera frames

Inspected the actual session request, renderer and installed WebXR types before implementing detection. The app requests local/local-floor, hit tests, anchors and DOM overlay; it does **not** request `camera-access` or expose readable camera pixels. No ADB executable/device bridge or target browser inspection tool was available, so a real target-phone pixel readback test could not be performed. No inference of support is made from Android/Chrome version alone.

Selected the explicitly permitted fallback: **a photo captured or selected before AR**, analyzed independently. No getUserMedia stream is created, concurrently or otherwise. Capture/editing is disabled while the immersive session is starting/running/ending. Start AR is disabled while detection/photo preparation is busy. Runtime session diagnostics inspect enabled-feature/camera metadata without reading a raw texture; all pixel access remains UNVERIFIED. A camera feature/metadata observation is not presented as tested readback.

Before a future live-XR detector is enabled, the target device must pass an actual permission/feature grant, valid XRView camera acquisition during an active frame, XRWebGLBinding texture access, permitted GPU sampling/readback, orientation/size validation and sustained processing/lifecycle test. This stage does not attempt or claim those steps. See the primary raw-camera specification linked in README.md.

## What is automated

- Local photo orientation/decode, bounded resize (maximum 960 px side), and RGBA extraction.
- OpenCV.js grayscale preprocessing, brightness/contrast checks, histogram equalization, Gaussian blur, Canny edges, contour approximation/convexity and Hough line segments.
- Line-pair intersections, corner ordering (TL/TR/BR/BL), bounds/area/convexity/aspect/degeneracy checks, edge-support checks, duplicate suppression and ranking of at most five quadrilateral proposals.
- A capped 0–95 heuristic score, weighted by edge support (55%), area (20%) and corner orthogonality (25%). This is **not a calibrated probability** or semantic gate-recognition score.
- Dark/low-contrast, dense-clutter, no-quadrilateral, worker/runtime/policy failure, malformed-input, cancellation and timeout outcomes. All automatic failure paths leave candidates empty rather than inserting a rectangle.
- Worker isolation for expensive OpenCV/WASM and geometric processing. Workers terminate on completion, error, cancellation, timeout or unmount; OpenCV matrices are deleted in finally blocks. The pinned compiled runtime is self-hosted, loaded only by the worker, and never substituted with a trained model.

## What requires user confirmation and spatial information

Every candidate is unconfirmed. Windows, walls and gate bars may produce stronger quadrilaterals than the desired inner opening. The user must inspect boundaries, choose a proposal or manually tap four real points, then drag 44 px handles/use the magnifier and nudge controls. Any edit clears confirmation and changes the source to manual; it has no automatic confidence. Incomplete, crossed, duplicate, tiny/whole-photo or unsupported quadrilaterals cannot be confirmed.

Tape-measured opening width and intended gate height are required for confirmation; neither is inferred from pixels. Confirmation stores normalized image coordinates for guidance and applies the entered width/height with scale 1/zero offsets to the existing gate calibration. It never requests XR or creates a world anchor.

The user must then open AR at the same entrance and re-identify the photo's BL/BR as the actual left/right inner pillar bases. Existing real XR hit points provide spatial position/yaw, world up provides vertical, and tape measurements provide size. Native anchors/world-space fallback remain owned by Stage 3. No photo-to-XR pose registration, automatic projection or homography-derived depth is invented. Without XR hits the existing fixed-distance placement remains explicitly approximate and requires manual alignment from multiple viewpoints.

## What requires more evidence or training data

No labeled real-entrance dataset was supplied. Synthetic rectangles are useful for pipeline checks, not a claim of gate recognition. A reliable semantic detector would require labeled entrance boundaries plus negative windows/walls, varied pillar/gate styles, lighting, shadows, clutter, occlusion, viewpoint, curved/missing top edges, region/device variation and held-out metrics. Such a model would need explicit introduction, evaluation and deployment; none is present here.

The current heuristic favors mostly horizontal/vertical straight boundaries and may fail on normal entrances lacking a visible top boundary. It is not universal automatic recognition. Manual correction/selection is an intended outcome, distinctly labeled.

## Files

Created:

- `src/detection/geometry.ts`: ordered corners, intersections, candidate validation and scoring.
- `src/detection/types.ts`: detector/worker/confirmed-opening contracts.
- `src/detection/engine.ts`: OpenCV and bounded geometry pipeline with matrix cleanup.
- `src/detection/detector.worker.ts`, `src/detection/client.ts`: lazy same-origin runtime loading, transferable pixels, cancellation/timeout and termination.
- `src/detection/photo.ts`: separate photo validation, oriented decode, resize and local preview URL.
- `src/detection/OpeningDetection.tsx`, `src/detection/OpeningEditor.tsx`: candidate review, empty/manual states, drag/magnifier/nudge editing, measurements and explicit confirmation.
- Detection geometry, real-WASM pipeline, worker-client and photo-workflow tests; `src/AppDetection.test.tsx` verifies measured-calibration transfer without XR launch.
- `src/xr/cameraAccess.ts`, `src/xr/cameraAccess.test.ts`: honest session camera feature/metadata diagnostics.
- `public/third-party/opencv-LICENSE.txt`, `THIRD_PARTY_NOTICES.md`, `STAGE4_REPORT.md`.

Modified:

- `src/App.tsx`: pre-AR photo workflow, processing/start interlock, confirmed measurement transfer and XR mapping guidance.
- `src/xr/session.ts`: adds passive camera-frame diagnostics to actual XR frame processing; no session feature changes or extra stream.
- `src/styles.css`: photo-editor handles and magnifier only; world gate rendering is untouched.
- `package.json`, `package-lock.json`: OpenCV.js runtime plus Node test typings.
- `tsconfig.json`: Node test types for loading the real WASM UMD package in Node.
- `README.md`: current workflow, exact Android acceptance, camera findings and worker/WASM deployment requirements.

Prior stage assets, Three.js world gate rendering, hit/anchor calibration, lock/reposition/reset/exit, gate replacement and all existing tests remain intact. No service credentials, server, cloud inference, model weights or paid tools were introduced.

## Validation and commands

Ran `rg`, directory inspection, `Get-Content`, and `Get-Command adb`; consulted primary OpenCV and Immersive Web documentation plus the dependency's own repository. Installed `@techstark/opencv-js` and `@types/node` using npm with a project-local cache. The dependency is `5.0.0-release.1` in the lockfile, with Apache-2.0 license copied for distribution.

Real OpenCV WASM tests run in Node on synthetic RGBA buffers. Browser-worker/UI boundaries are separately mocked. The UMD package's Promise export required Node createRequire in the integration test to avoid ESM namespace assimilation; Node typings were added accordingly. A clean-install attempt initially encountered a Windows file lock from an owned source-inspection process; that process was closed and installation retried.

Final validation after clean installation:

| Command/check | Result |
| --- | --- |
| `npm ci --cache .npm-cache --fetch-retries=0 --fetch-timeout=30000` | PASS: 254 packages installed, 255 audited, zero reported vulnerabilities |
| `npm ls --depth=0` | PASS: dependency tree resolves, including OpenCV 5.0.0-release.1 and Node test types |
| `npm run typecheck` | PASS: strict TypeScript |
| `npm run lint` | PASS: zero errors/warnings |
| `npm test` | PASS: 14 test files, 84 tests |
| `npm run build` | PASS: production build without warnings |
| Production preview + HTTP HEAD checks | PASS: HTML, gate PNG, CSS, app JS, deferred Three.js, detector worker, OpenCV asset and license return HTTP 200 with expected MIME types |

Emitted sizes: HTML 0.54 kB; CSS 15.91 kB; app/common JS 436.77 kB (129.79 kB gzip); deferred renderer 353.40 kB; detection worker 5.57 kB; separate OpenCV JS/embedded WASM 13,298.86 kB. The OpenCV asset is not requested by the initial page and is self-hosted. Preview server was stopped after checks.

New tests cover corner ordering, parallel/intersecting lines, crossed/repeated/collinear/nonfinite/out-of-range geometry, heuristic scoring, real-WASM synthetic proposals, dark/blank/no-supported-opening failures, malformed buffers, worker transfer/termination/error/cancel/timeout, disabled capture during XR, no default rectangle after failure, heuristic disclosure, manual correction/magnifier/confirmation invalidation, required measurements and measurement-only integration without automatic XR launch. All prior tests remain passing.

No actual target Android browser, immersive pixel readback, browser worker execution, touch interaction or real-photo accuracy has been verified by these automated tests. The HTTP checks establish serving/packaging only, not browser runtime behavior.

## Android/deployment handoff

Follow **Stage 4 Android workflow and acceptance** in README.md, then the retained Stage 3 spatial calibration checklist. Verify clear, dark, blank, cluttered, non-gate rectangular and missing-edge photos; compare proposal/manual states; test correction and magnifier; record actual worker/WASM loading and cancellation; confirm that measured dimensions alone transfer to AR and that two spatial bases are still required. Test real world stability, existing controls and cleanup as before.

Deploy all `dist/` assets over trusted HTTPS, including the approximately 13.3 MB OpenCV runtime, worker, normal JS/CSS/images and third-party license. Use compression/cache headers and proper JavaScript MIME types. Under CSP, permit same-origin workers/modules and WASM compilation, blob image previews and the app's inline position styles. The default single-worker runtime does not need SharedArrayBuffer/cross-origin isolation. Existing xr-spatial-tracking policy guidance is retained. No deployment is performed by this stage.

Stop at Stage 4. Any future live camera analysis or semantic trained detector requires separate implementation and device/data validation.
