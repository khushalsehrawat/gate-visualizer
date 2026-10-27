# Left/right automatic gate fitting

## Changes
- `src/xr/session.ts`: selected real XR ground points determine gate centre, direction and exact horizontal width. Clear stale scale/offset/rotation when fitting; use proportional artwork height. No pillar recognition is required. Reject coincident, out-of-range or uneven ground selections.
- `src/xr/useXRSession.ts`: default to two-point placement and synchronize automatically fitted dimensions with the controls.
- `src/LivePreview.tsx`, `src/ui/PlacementGuide.tsx`, `src/ui/CapabilityPanel.tsx`, `src/site/Help.tsx`: simple left/right instructions; keep detailed adjustments in Fine Tune. Hide the single-point size slider in automatic-width mode.
- `src/picture/camera.ts`, `src/picture/LivePicture.tsx`: request 1280×720, up to 30 fps and optional continuous autofocus for the separate picture camera. Keep frozen display captures up to 1280px while CV receives only 360px analysis frames from the same capture. Release temporary canvas backing storage.
- Camera, controller and UI regression tests cover automatic width/centre, stale adjustments, focus capability and separate capture/analysis resolutions. Magnifier wording reflects analysis coordinates.

## Verification
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`: pass; 170 tests across 36 files.
- `node scripts/simple-ui-qa.mjs`: pass against production preview with Chrome simulated media/software WebGL. Camera start/stop, frozen manual region, fitted preview, four-point confirmation, collapsed settings and mobile overflow checked. QA processes stopped.
- No Android hardware measurements or physical tracking tests were performed.

## Android acceptance
1. Deploy the built `dist` folder over trusted HTTPS (Hostinger: build `npm run build`, output `dist`). If GitHub auto-deploy is connected, push to its configured branch and wait for a successful deployment. Otherwise redeploy explicitly.
2. Open the new deployment in Android Chrome. Start Live Preview and select/upload a gate.
3. Scan textured ground slowly until the real teal surface ring appears. Aim it at the left ground edge and tap Set LEFT point; aim at the right edge at the same level and tap Set RIGHT point. These buttons capture the centre-ring world position, not arbitrary touchscreen pixels.
4. Check width and centre between the saved points, then walk sideways. Gate must stay in world coordinates. Change Gate must retain placement; Reset must restart capture. Fine Tune handles height/rotation adjustments; two ground points cannot measure opening height.
5. Exit/restart and test portrait/landscape. Check tracking loss honestly hides unsupported poses and recovery restores placement.
6. Separately test Camera on Entrance Picture: rear camera sharpness, freeze, four-corner correction/confirmation, tracking and stop. Compare the frozen display against the old low-resolution capture.

## Limits
A valid surface circle cannot be guaranteed in every condition. Real WebXR needs actual hit-test evidence; no fake screen-fixed circle was added. The existing explicit approximate manual-placement fallback remains available. Width is metric only to the accuracy of XR point measurements. Height follows image proportions until adjusted.

The 720p/focus changes apply to the separate ordinary camera. WebXR passthrough focus/resolution is controlled by Chrome/ARCore; these changes do not prove AR blur is fixed. No simultaneous MediaDevices camera is started during immersive AR. No lag-free or physical-device verification claim is made. Existing bounded worker-based image analysis and genuine XR render loop are preserved.
