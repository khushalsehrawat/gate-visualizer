# Auto-fit first, separate manual region

## Behavior

Picture camera mode now shows a fitted preview on the selected **frozen camera frame before live tracking is initialized**. It does not wait for an AR hit-test ring or an image-tracking reference to succeed before the customer can inspect the fit.

1. Open picture camera and Select opening.
2. Existing OpenCV geometric proposals run automatically on that frame. No default area is substituted if they fail.
3. A valid area shows the gate inside it using Auto-fit, preserving the image aspect ratio. The editable layout ratio starts from apparent selected-edge proportions, not a real-world size/depth measurement.
4. Manual region is a separate section. If detection fails, it opens for selecting TL/TR/BR/BL. After manual selection, Auto-fit gate closes the editor and shows the fitted preview.
5. Confirm all four corners to start live picture matching. A camera image alone does not establish tracking; insufficient features still hide the live gate. Frozen preview remains explicitly labeled as such.

## Changes

- Added `src/picture/ReviewGatePreview.tsx`, using the existing projective WebGL renderer over the captured frame, with resource cleanup and canvas replacement when source images change.
- `src/picture/fitting.ts`: default to Fit instead of stretching, plus apparent-region aspect calculation. Wide, tall and square gates fit without manual scaling. Fill/stretch and Crop remain optional settings.
- `src/picture/LivePicture.tsx`: automatic area proposal on capture, fitted preview before tracking, separate manual editor, one-click auto-fit/reset and preserved four-corner confirmation.
- `src/site/Website.tsx`: lazy-load picture mode so its extra review UI does not inflate the initial app bundle above the prior Vite warning threshold.
- Updated fitting and UI tests and extended `scripts/simple-ui-qa.mjs` to test a real browser's four-point manual selection and GPU preview before tracking. Capped Vitest at four workers in `vite.config.ts` to avoid memory/CPU oversubscription and intermittent five-second test timeouts in this environment.

## Validation

- Typecheck and lint passed.
- Full unit/integration suite: **33 files, 149 tests passed**.
- Production build passed without the intermediate oversized-chunk warning.
- Browser fake-device camera check passed: start/stop, automatic proposal attempt, separate manual selection, visible projective GPU preview before tracking, four confirmation checkboxes still unchecked, live-tracking confirmation still disabled. Screenshot inspected in `.browser-qa/auto-fit-before-tracking.png`.

## Android test

Redeploy to Hostinger and reload `https://YOUR-DOMAIN/#/picture`. Upload a gate, Open camera, aim at the picture and Select opening. If a valid proposal exists, inspect the fitted frozen-frame preview. Otherwise open Manual region, tap four corners and press Auto-fit gate. Check that the whole gate stays inside that area without stretching; optionally change Fill/Crop under Adjust gate. Confirm the four points and start live tracking only after the fit is satisfactory. Verify target loss hides the live gate, and Close camera stops the stream.

For a real entrance use `/#/live`. Existing No surface? Place manually remains available without waiting for a ring, but it provides approximate depth and still requires positional XR tracking. No feature can guarantee real tracking in every lighting/surface/motion condition merely because the camera is working. No four image points are treated as a world anchor. Physical Samsung M34 behavior remains UNVERIFIED.
