# Bottom-point capture and mobile rendering improvements

## Changes

- Added `src/ui/PlacementGuide.tsx` with large LEFT/RIGHT bottom capture buttons, a two-step indicator, live surface readiness and an explicit explanation that the teal ring is the captured location. Buttons require a loaded gate, positional tracking and a reported surface. The controller still checks the actual hit in the capture frame, so a stale UI cannot create an invented surface.
- Added a persistent amber world-space ring at the captured left point. It stays fixed while aiming at the right bottom, hides on tracking loss, and is removed when placing/resetting. **Retake left bottom** clears the partial point without discarding measured dimensions or the gate image.
- Kept the capture guide at the top of the active AR control card. Existing manual-placement confirmation, calibration, lock, reset/reposition, photo review and session exit remain available.
- Updated `src/xr/rendering.ts`: disabled multisample antialiasing, requested the high-performance GPU preference, disabled stencil, limited uploaded live textures to 2048 px on their longest side using proportional resampling, and disabled live texture mipmap generation. Original uploaded image metadata and photo/export source remain unchanged. A missing 2D context falls back to the existing source image.
- Updated `src/xr/session.ts`: uses 0.75 XR framebuffer scale configured before attaching the session, pixel ratio 1, and compositor foveation where supported. These settings reduce virtual-content render work; they do not change passthrough focus or claim to sharpen the camera. Framebuffer area at scale 0.75 is 56.25% of scale 1 before platform constraints. Platform support and actual speed benefit vary.
- Stopped reading hit-test results after placement; scanning resumes on reposition/reset. The hit-test source remains session-owned and is cancelled on exit as before.
- Limited changing hit-test UI reports to once per 150 ms; real XR hit evaluation, ring rendering, camera updates and tracking safety continue each frame. Explicit capture requests bypass status throttling. Reused the gate transform output matrix to reduce per-frame temporary allocations.
- Added/updated tests in `src/ui/PlacementGuide.test.tsx`, `src/xr/session.test.ts`, `src/xr/rendering.test.ts`, and `src/geometry/calibration.test.ts`.

API reference: https://threejs.org/docs/pages/WebXRManager (framebuffer scale must be set before the XR session; foveation is compositor-dependent).

## Checks

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 26 files, 127 tests passed.
- `npm run build`: passed.

No dependencies, backend, synthetic camera overlay or additional camera stream were introduced. The native XR animation loop and world-space tracking remain intact.

## Samsung M34 acceptance checklist

1. Deploy the new source with Hostinger's existing `npm run build` / `dist` settings; reload the HTTPS site in Chrome to load the new hashed bundles.
2. Upload a gate and measured width/height, then Start AR. Point at textured, well-lit ground.
3. Confirm the LEFT bottom button stays disabled without a tracked surface and enables when the teal ring appears. Aim the ring at the left pillar's inner bottom and capture.
4. Verify the amber ring stays at that left bottom while the phone moves. **Retake left bottom** should remove it and return to the left step without changing width/height or image.
5. Capture the right inner bottom at the same ground level. Verify a duplicate/implausible point is rejected, and valid points place the vertical gate. Check alignment from front and side, adjust, then lock.
6. Move sideways: the gate must remain world-fixed. Tracking loss must hide it; positional recovery must restore the same placement. Reposition must restart surface capture.
7. If scanning never finds a surface, the explicit confirmed approximate manual fallback is still available. It does not provide measured entrance depth.
8. Compare diagnostic frame samples and responsiveness with the earlier roughly 12 fps report under similar lighting, temperature and scene conditions. Test for several minutes, then Exit AR and start again to check cleanup/restart.

Actual Samsung M34 FPS, thermal behavior, camera clarity and physical placement remain **UNVERIFIED**. These changes reduce known application work; they do not prove that all device stalls are fixed. Virtual gate edges can be softer under the reduced render resolution; camera blur remains deferred at the user's request.
