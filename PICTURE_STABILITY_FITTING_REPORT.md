# Picture tracking status and arbitrary-region fitting

## Changes

- Removed the repeated device-testing label and per-frame inlier counts from picture success messages. Kept physical-device validation UNVERIFIED in static information; XR's live positional status now says Tracking independently of that notice.
- Added `src/picture/health.ts`: short matching gaps retain a consistent explanatory message. Missing evidence still hides the gate immediately. Results expire 500 ms after frame capture, including processing time; a late result cannot extend its own freshness. Confirmed loss appears after 1.2 seconds without good evidence, and a valid target can reacquire.
- Reduced camera analysis resolution from 480 to 360 px on the longest side, ORB features from 400 to 320, and added grayscale histogram normalization. Single-flight worker processing remains bounded. These changes do not alter the WebXR tracking engine or claim to fix camera focus.
- Added explicitly manual arbitrary-region validation for picture mode, accepting larger/full-screen and differently proportioned convex selections. Existing automatic opening heuristics, photo mode and XR calibration retain their original restrictions. No default quadrilateral is supplied.
- Added `src/picture/fitting.ts` and inverse-projective shader controls: Fill selected region (explicit stretching), Fit whole gate, Crop to fill, editable estimated layout ratio, independent width/height, horizontal/vertical offsets and Reset fit. Adjustments are clipped to the confirmed region. They do not move an untracked gate or supply world depth.
- Added tests for status stability, evidence age, reacquisition, fill/fit/crop geometry, generic-region validation, invalid polygons, confirmation invalidation and fitting controls.

## Validation

`npm run typecheck`, `npm run lint`, `npm test` (**33 files, 146 tests**) and `npm run build` passed. The actual built OpenCV worker and WebGL overlay also passed `node scripts/picture-qa.mjs`: synthetic translated target **183/184 inliers**, maximum projected-corner error **0.700 px**, blank frame hidden, target reacquired, shader overlay rendered. This is software-WebGL desktop evidence, not physical-phone tracking validation.

## Android acceptance

1. Redeploy the latest complete `dist` output on Hostinger and reload Chrome over HTTPS.
2. Open Camera on Entrance Picture, start the camera, aim at a textured screen/paper picture and freeze a clear frame.
3. Use Select any region manually / clear points, tap TL/TR/BR/BL of the desired region, and confirm every point. Near-full-frame regions should now be accepted when geometrically valid. Blank regions may fail feature initialization honestly.
4. Choose Fill selected region to map the complete gate to all four corners. Fit preserves artwork proportions; Crop fills the region by trimming artwork. Set the layout width/height ratio for Fit/Crop, then adjust size/offsets as required.
5. Start tracking. Move slowly: the gate should follow the matched region. The device-testing notice must stay static and brief misses must not flash success/failure messages. Missing/stale evidence must still hide the gate; restoring the original region should reacquire it.
6. Check sustained target loss, fast motion, low light, repeated patterns, Stop, page navigation and restart. Real entrances still use Live Camera AR and spatial calibration.

There is no universal perfect automatic fit for whichever arbitrary surface the camera sees. Four confirmed image corners define a 2D mapping; a blank region has no reliable image features. Camera motion alone does not establish either image matching or positional XR tracking. Physical Samsung M34 stability and FPS remain UNVERIFIED.
