# Stage 5 — Professional 2D fitting and live preview

Completed in the existing `D:\GateVisualizer` project. No dependencies were added or changed. The previously tested XR session/tracking, two-point calibration, gate uploads, diagnostic marker and photo-detection workflows remain available. New Stage 5 browser/GPU/physical-device behavior is **UNVERIFIED** pending Android acceptance.

## Implemented fitting and rendering

- **Fit:** full image contained within the scaled measured width/height, bottom-centered, no crop/stretch.
- **Crop:** plane exactly matches the scaled measured opening; UVs crop the source to preserve proportions. Horizontal crop is centered and vertical crop preserves the bottom, trimming the top if necessary.
- **Proportional:** plane width follows scaled measured width; height follows the image aspect, possibly exceeding the opening height. No stretching/cropping.
- One upright bottom-centered unit plane is scaled to the resulting metric dimensions. The UI reports actual plane size and preserves the existing calibrated world/anchor transform. Transparent padding remains part of the image rectangle; no unmeasured auto-fitting is claimed.
- Fine world X/Z/base-height increments are 0.01 m; yaw increments are 0.1 degrees. Along gate ±1 cm uses the placed plane's horizontal world direction; Raise/Lower uses world up. Manual edits reset filtering for immediate response. Lock protects spatial edits and fitting mode.
- Small world-anchor corrections can use optional 80 ms exponential position/quaternion filtering. It never uses the viewer/camera transform. New placement, manual edits, loss/recovery and reference reset clear the filter. Large native corrections (>0.5 m or >30 degrees) snap instead of slowly sliding into a new reference frame. This is a visual stability aid, not an improvement to ARCore's spatial accuracy.
- Brightness, contrast, opacity and manual exposure adjust the existing image material. Contrast uses a linear-light 0.18 pivot followed by brightness × 2^EV. Shader uniforms update without allocating new geometry or processing the whole scene. Alpha is retained, the plane is double-sided in a single pass, and no extrusion/shadow geometry is added.

## Catalogue, comparison and capture

Three local catalogue PNGs are explicitly marked original placeholders. Gate-01 is retained; gate-02 and gate-03 are new flat horizontal/vertical-bar assets, including a different aspect ratio for fitting checks. They are not manufactured-product photographs or real material finishes. The existing upload flow is preserved. Successful catalogue changes retain anchor/world placement, dimensions, offsets, fitting, appearance and lock; failures retain the old image and stale completions are ignored. Only the active texture belongs to the scene; its predecessor is disposed.

After placement in gate mode, Before hides only the gate mesh, and After restores it without resetting tracking/placement. The active native XR passthrough remains Chrome's responsibility. Controls require DOM overlay, and the Stage 2 diagnostic cube/photo editor are not given a simulated AR comparison. The overlay card is scrollable and at most 48% of viewport height so the center aiming ray remains clear; its input/scroll interactions suppress native XR select.

**Export gate-only PNG** uses only the browser's Canvas 2D/toBlob mechanism on the already-permitted decoded image. It applies the selected UV crop, dimensions and manual appearance to a front-elevation asset, capped at 1024 pixels on the longest side. It offers an explicit user-clicked download link named `gate-only-no-environment.png`. It is not a screenshot of the XR camera/viewpoint and contains no real entrance/passthrough. It never reads an XR framebuffer/camera texture, calls readPixels, starts getUserMedia or invokes display capture. Canvas allocation is released in finally; result URLs are revoked on replacement/unmount. Prepared files reflect settings at export time, with instructions to re-export after edits. Browser resampling/color and tiny alpha-test edge differences may differ from the GPU image.

When an environment screenshot is desired, the UI explicitly directs the user to Android's system screenshot/recording controls **if Chrome/OS permit them**, and asks them to inspect whether camera content was included. There is no in-app claim that XR passthrough is capturable.

## Realism support matrix

| Feature | Support and verification |
| --- | --- |
| Metric upright image plane, aspect modes, manual placement | Implemented; unit-tested; Stage 5 Android acceptance pending |
| Manual brightness/contrast/opacity/exposure | Implemented; shader uniforms and CPU export tested; actual GPU appearance unverified |
| Live before/after | Implemented for placed gate plus native DOM overlay; physical behavior unverified |
| Gate-only PNG | Browser-supported Canvas/toBlob implementation and failure handling tested with mocked browser boundaries; Android download/appearance unverified |
| XR passthrough screenshot | Unavailable in this app; compositor/raw-camera capture has not been verified |
| Foreground occlusion | **OFF**: no verified real depth or segmentation source. No photo/hit-test masks or invented depth |
| Physically accurate shadows/reflections/scene-light matching | Unsupported. Manual exposure is artistic, not measured environment lighting |
| Gate thickness/3D gate models | Not implemented. The preserved diagnostic cube is only the Stage 2 test marker |

## Tracking recovery, profiling and cleanup

Native session initiation, feature requests, reference spaces, hit tests and anchor creation remain unchanged. Tracking loss or unavailable anchor pose hides content; recovery restores the stored placement. A reference-space reset clears calibration and unlocks it, requesting recapture. Reset additionally restores neutral Fit/After presentation and estimated sizing; Reposition preserves design/dimensions/appearance but clears spatial samples/offsets and returns to After.

The frame profiler holds at most 120 intervals/CPU samples and reports at most once per second. It shows callback fps, p95 interval, mean application CPU frame time (including renderer submission), renderer draw calls and geometry/texture counts where available. Long visible-session stalls are included rather than removed to inflate fps. Visibility pauses reset history. Values are not GPU times, measured camera fps, full browser/GPU memory bytes, or device performance guarantees. Last counters can remain visible after exit for review.

The renderer reuses the gate geometry/material. Fit/crop alters scale/UVs, appearance alters uniforms, and before/after changes visibility without additional render targets. Previous image textures are disposed; export canvases/URLs and existing upload resources are cleaned. Session teardown continues to stop animation, remove listeners/canvas, delete anchors, cancel hit sources, dispose materials/geometries/textures and release the renderer/context. No camera-follow behavior or second camera stream is introduced.

## Files

Created:

- `src/geometry/fitting.ts` and its tests: metric fit/crop/proportional layouts and UV windows.
- `src/gates/presentation.ts` and its tests: validated appearance settings and neutral/manual color math.
- `src/xr/stability.ts`, `src/xr/profiling.ts` and their tests: world-only pose filtering and bounded frame/resource diagnostics.
- `src/preview/exportGate.ts` and its tests: explicitly gate-only PNG generation and cleanup.
- `src/ui/PresentationControls.tsx` and its tests: catalogue, fitting, appearance, comparison and capture/fallback UI.
- `scripts/generate-catalogue.mjs`, `public/gates/gate-02.png`, `public/gates/gate-03.png`: original procedural flat PNG placeholders.
- `STAGE5_REPORT.md`.

Modified:

- `src/xr/rendering.ts`: texture UV fitting, image-only appearance uniforms, before/after visibility and texture reuse/disposal.
- `src/xr/session.ts`: presentation state, world-direction fine nudge, optional filtering/profiling and overlay input protection; native session/tracking flow retained.
- `src/xr/useXRSession.ts`: validated presentation bridge, fine nudge, Reset/Reposition/session-start comparison transitions.
- `src/gates/assets.ts`, `src/gates/useGateImage.ts`: local catalogue and existing safe decode/race handling.
- `src/geometry/calibration.ts`: additional aspect/degenerate-plane guards.
- `src/ui/GateControls.tsx`: finer numeric increments, metric fitting readout and nudge actions.
- `src/App.tsx`, `src/ui/CapabilityPanel.tsx`, `src/styles.css`: Stage 5 controls, realism status, profiles and bounded native overlay card.
- Existing rendering, image and session tests: additional switching/lock/crop/recovery cases.
- `public/gates/README.md`, `README.md`: asset provenance and exact Stage 5 workflow/support/acceptance guidance.

Package manifests, dependencies, Stage 4 detector/worker, original assets, native XR configuration and all earlier test cases were preserved.

## Commands and results

Inspected the existing project/modules and checked for project instruction files; consulted primary Three.js material/renderer and WebXR depth documentation. Generated only the two new placeholder PNGs with `node scripts/generate-catalogue.mjs`. No installation or deployment was needed.

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS — strict TypeScript |
| `npm run lint` | PASS — zero errors/warnings |
| `npm test` | PASS — 20 files, **106 tests**; all prior 84 cases retained |
| `npm run build` | PASS — Vite production build, no build warnings |
| Production preview + HTTP HEAD checks | PASS — page, all catalogue PNGs, CSS, app JS, renderer, export chunk, retained detector/OpenCV assets and license return HTTP 200 with expected MIME types |

New tests cover exact crop-plane size and UV proportions for wide/tall/square artwork; proportional overflow; scale/invalid geometry; neutral/manual appearance math; live shader-uniform updates without resource churn; neutral/cropped export and unsupported browser handling; catalogue races; unchanged world transforms through before/after and replacement; lock/fitting protection; fine nudges; tracking recovery/recalibration; bounded timing statistics including long stalls; and prepared-download URL cleanup.

Final build output: HTML 0.54 kB; CSS 16.35 kB; app/common JS 448.69 kB (133.26 kB gzip); deferred renderer 354.33 kB; deferred export helper 1.28 kB. The retained Stage 4 worker/OpenCV asset remain separately loaded. A local production preview was used for serving checks and stopped afterward. A final CSS-only adjustment reserves safe-area padding below the 48% overlay height limit, preserving the center aim point in short landscape views; its production rebuild passed. HTTP checks establish packaging, not GPU rendering correctness.

## Android handoff and remaining limits

Follow **Stage 5 fitting and live preview**, **Capture and realism support**, and **Performance profiling and Stage 5 Android acceptance** in README.md. Verify shader appearance/alpha, cropped top/base behavior, exact fine alignment from multiple views, ten catalogue switches without resource growth, before/after without pose change, real tracking interruption/recovery, reference reset/recalibration and repeated native exit/restart. Record actual callback/p95/CPU/resource samples after warm-up; no physical device benchmark is claimed here.

Actual Android GPU shader compilation/appearance, DOM-overlay touch ergonomics, file downloads, OS passthrough screenshots, physical alignment/drift and performance remain unverified in this environment. Foreground occlusion will remain disabled unless a real depth/segmentation source is separately implemented and verified. No 2D homography, placeholder artwork or smoothing filter is presented as calibrated depth, physical lighting or guaranteed tracking accuracy.

Stopped after Stage 5; no deployment or later-stage work performed.
