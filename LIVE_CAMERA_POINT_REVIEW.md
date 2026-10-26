# Camera clarity and four-point review

## Changes

- `src/LivePreview.tsx`: makes entrance photo detection visible by default; describes the photo-to-world mapping; adds immersive camera clarity guidance and a working Exit AR to retry camera button.
- `src/detection/OpeningDetection.tsx`: requires individual TL, TR, BR, BL confirmation after geometric validation and measured dimensions. Editing points, candidate, photo or dimensions invalidates review. Unchecking a point invalidates confirmation.
- `src/styles.css`: adds touch-friendly point confirmation and camera help styling.
- `src/detection/OpeningDetection.test.tsx` and `src/AppDetection.test.tsx`: cover review gating, invalidation and confirmed dimensions flowing into AR calibration without starting a session automatically.

The existing OpenCV worker performs automatic geometric proposals on a separate photo. No model, default rectangle, second immersive camera stream or screen-fixed gate was added. Real XR session, two spatial base-point captures and world tracking are preserved.

## Camera limitation

Inspection found no app CSS blur on the XR camera view. The reported session does not enable raw camera access. No focus control or readable passthrough image is available through the current integration. Therefore camera blur has NOT been fixed or verified on the phone. Chrome/ARCore supplies the passthrough; changing virtual gate texture settings cannot refocus it.

Reference: https://immersive-web.github.io/raw-camera-access/ (separate optional capability for camera images, no focus-setting API).

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 24 files, 116 tests passed.
- `npm run build`: passed; deploy the complete `dist` output using the existing Hostinger settings.
- Physical Android camera clarity, surface acquisition and placement: UNVERIFIED. No claim of perfect AR or universal gate recognition.

## Android acceptance

1. Redeploy the updated source and reload the HTTPS live page in Android Chrome.
2. Upload the gate image. Before starting AR, take/select a sharp entrance photo using Auto-detect opening points & confirm all four.
3. Wait for detection. If a valid candidate exists, inspect all edges. Otherwise manually mark TL, TR, BR, BL; no success should be reported for missing candidates.
4. Correct handles with the magnifier. Enter tape-measured width/height, then check each of the four confirmation boxes. Confirm boundaries & measured dimensions must remain disabled until all requirements are met.
5. Confirm. Change a point or measurement and verify confirmation is revoked. Review again.
6. Start AR from the button. Scan textured ground in good light. Capture real LEFT then RIGHT inner pillar bases at the same entrance. Photo points alone do not establish world depth, pose or an anchor.
7. Verify the gate from front and side, adjust dimensions/offset/yaw and lock. Walk sideways: the gate must stay fixed; tracking loss must hide invalid content.
8. If no teal ring appears, placement is still unavailable; four photo confirmations must not bypass missing spatial information.
9. If passthrough is blurry, compare with the normal Camera app at the same distance, record phone model and Chrome version, then Exit AR to retry camera. Restart with Start AR; placement must be recaptured.

Exact phone model and sharpness comparison are still needed to investigate the device-specific camera problem.

## Samsung M34 follow-up: placement when scanning stalls

User identified a Samsung M34 and asked to defer camera blur investigation. Added an explicit manual-placement route even when hit testing is available but returns no surfaces. Choose **No surface? Place manually**, read the approximation guidance, then **Confirm approximate placement**; **Keep scanning** cancels without placing.

This queues placement in a valid tracked XR frame, clears any partial left-base calibration and creates a vertical plane once 1.5 m ahead at camera height. It ignores unrelated surface hits and never uses their anchors. Existing frame-created anchors or session-scoped world transforms remain available. It does not follow later camera poses. Tracking loss blocks placement/hides the gate; reset returns to ordinary two-hit calibration.

Use **Gate calibration & image** to lower the gate base, adjust depth/rotation/size and align both pillars, then **Lock Placement**. This is approximate manual alignment, not detected entrance depth. **Reposition** recaptures placement without discarding the selected gate or measured dimensions. Camera blur remains unresolved and physical Samsung M34 behavior remains UNVERIFIED.

Changed `src/xr/session.ts`, `src/xr/useXRSession.ts`, `src/LivePreview.tsx`; added controller regression coverage and a UI confirmation/cancellation test in `src/LiveManualPlacement.test.tsx`.

Follow-up validation: `npm run typecheck`, `npm run lint`, `npm test` (25 files, 120 tests), and `npm run build` all passed.
