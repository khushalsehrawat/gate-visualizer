# Simplified app and camera controls

- Replaced the large home landing sections with a short introduction and the two existing camera-mode choices. Catalogue, uploads, photo mode, saved previews and help remain in the menu. Mode choices become compact on camera setup pages.
- Live AR setup now presents gate upload, optional size and Open live camera. Selected artwork and optional photo detection are collapsed. During AR, the primary controls are the current bottom-point capture, lock/reposition and Exit AR. Fitting, appearance, diagnostic marker mode, reset, help and session diagnostics remain under optional sections. The native WebXR controller and tracking logic were not changed.
- Picture mode presents Open camera, then Select opening, four-corner review and Show my gate. Close camera remains available throughout initialization, review and tracking. Only relevant actions are shown at each step. Fitting/opacity and technical help are collapsed. Camera state hides the site header, footer and mode choices until closed.
- Shortened prompts and kept permission, unsupported-device and placement errors visible. Physical-device validation remains unverified in optional help/static notes.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 33 files, 146 tests passed.
- `npm run build`: passed.
- `node scripts/simple-ui-qa.mjs`: actual desktop Chrome, mobile viewport and browser fake camera passed home/mode navigation, camera start/stop, header hiding/restoration, closed optional settings and horizontal-overflow checks. Screenshots reviewed locally in `.browser-qa/`. This does not verify a physical phone or immersive AR.

## Android acceptance

Redeploy the source using the existing Hostinger build settings, then reload the HTTPS site. Choose Live Camera AR, upload/select a gate and Open live camera; scan and capture the left/right bottom points, then lock. Verify Adjust gate & more can still open calibration and diagnostics, and Exit AR works. For Camera on Entrance Picture, Open camera, Select opening, correct and confirm four points, then Show my gate. Adjust gate should remain collapsed until needed; Close camera must stop the stream and restore navigation. Verify denied permissions and tracking-loss messages remain understandable.

No tracking accuracy, camera blur or phone FPS improvement is claimed by this UI change. Samsung M34 physical-device behavior remains UNVERIFIED.
