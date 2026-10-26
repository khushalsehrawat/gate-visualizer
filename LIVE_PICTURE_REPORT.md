# Live camera preview of entrance pictures

## Two distinct live modes

- `/#/live`: existing immersive WebXR mode for a real entrance, with session-scoped world tracking and spatial bottom-point calibration. This engine was preserved.
- `/#/picture`: new experimental **Live Picture Preview** for an entrance picture on another screen or printed paper. It opens one ordinary rear camera, learns image features inside a confirmed opening, matches those features in subsequent frames, and renders the gate using a projective 2D mapping. It does not reconstruct the depicted entrance in 3D or create a world anchor.
- `/#/photo`: existing saved-image upload, four-corner editing and composited export.

## Implementation

Added `src/picture/LivePicture.tsx`, `camera.ts`, `workerClient.ts`, `tracker.worker.ts`, `tracking.ts` and `overlay.ts`. Added navigation and help in `src/site/Website.tsx`, `src/site/Help.tsx`, `src/LivePreview.tsx` and picture viewport styles in `src/site/site.css`.

The customer starts the camera, freezes a frame, optionally asks for existing OpenCV geometric corner suggestions, corrects all four corners, checks each confirmation, then resumes live picture matching. No default rectangle or semantic recognition model is supplied.

The persistent OpenCV worker uses ORB descriptors, Hamming nearest-neighbor matching with ratio/uniqueness filters, and RANSAC homography estimation. It requires at least 10 matches, 8 inliers, 60% inlier support, distributed reference evidence and a valid projected quadrilateral. Weak/invalid results hide the gate. Matching always compares against the original reference, allowing reacquisition rather than accumulating optical-flow drift.

Processing is bounded to 480 px on the longest side, 400 features and approximately 6 analysis requests per second, with one request in flight. Slow results are rejected and a timeout terminates stalled workers. The camera video remains separate from analysis. Gate rendering uses a WebGL inverse-projective shader and a bounded live texture, not a screen-fixed HTML gate. The whole artwork maps to the confirmed opening; use tightly cropped images with suitable proportions.

Stopping, leaving the page, hiding the document, camera-track termination and component unmount stop tracks/worker/timers and dispose renderer resources. Late permission results stop their tracks. AR navigation remains blocked until the XR session exits. No simultaneous camera stream is opened by the immersive XR engine.

Reference: https://docs.opencv.org/4.0.0/d9/d0c/group__calib3d.html and https://github.com/opencv/opencv/blob/5.x/doc/tutorials/features/feature_homography/feature_homography.markdown .

## Validation

- `npm run typecheck`, `npm run lint`, `npm test` (**31 files, 139 tests**) and `npm run build`: all passed.
- Added tests for geometric evidence, degeneracy, missing matches, camera cleanup, late permissions, worker backpressure/timeouts, confirmation gating, tracking loss and navigation.
- `scripts/picture-qa.mjs` exercises the actual built OpenCV worker and WebGL overlay in a dedicated local Chrome browser, using a synthetic textured reference and translated frame. Result: **226/228 inliers, maximum projected-corner error 1.121 pixels**, blank frame rejected, original target reacquired, WebGL overlay rendered and hid correctly. This browser used software WebGL because the environment's sandboxed GPU process could not initialize.
- This is synthetic desktop runtime evidence, not a physical Android accuracy or FPS claim. Samsung M34 camera behavior and tracking are **UNVERIFIED**.

## Hostinger deployment

Build command `npm run build`, output `dist`, Node 24, no environment variables. Deploy the complete generated output, including both worker bundles and the local OpenCV runtime. Use HTTPS. If overriding Permissions-Policy, allow `camera=(self)` and `xr-spatial-tracking=(self)`; do not block same-origin workers/WASM with custom content policies. No backend, paid API or external model is required.

## Exact customer test

1. Redeploy, reload Android Chrome, and open `https://YOUR-DOMAIN/#/picture`.
2. Upload a transparent gate PNG/WebP. Point the phone at a well-lit, static entrance picture on a screen or printed page. Avoid reflections and fill much of the view with the picture.
3. Press **Start picture camera** and allow camera permission. Press **Freeze picture / select again** when the picture is sharp.
4. Use **Suggest points**, or manually tap TL, TR, BR, BL of the entrance opening inside that picture. Correct with handles/magnifier. Confirm all four checkboxes.
5. Press **Confirm points & track picture live**. Keep the same picture in view. The gate must appear only after sufficient feature evidence is found and follow the picture as the phone moves slowly.
6. Cover/remove the picture: the gate should hide. Restore it: a valid target should be reacquired. Low-detail/repeated patterns may never provide enough evidence; use Photo Preview in that case.
7. Test Stop, navigation away/back, permission denial, background/foreground, camera termination, orientation changes and retry. Orientation/resolution changes require freezing and confirming again.
8. For a real entrance, stop/leave picture mode, open `/#/live`, then Start AR and use the existing real spatial calibration. Do not treat the picture homography as an XR anchor.

## Limitations

Not universal recognition. Repeated slats, blank regions, glare, moire from screens, substantial occlusion, steep perspective and fast movement can defeat feature matching. Similar repeated pictures can be ambiguous. Matching may lag the live video; results older than 350 ms are rejected and displayed gate content expires after 250 ms without an update. Picture mode supplies no real depth, occlusion, physical shadows, persistent world anchors, 3D model or camera-focus fix. It does not export a live composite; use the existing Photo Preview export workflow for saved images.
