# Entrance image preview

Update: live camera tracking of a printed/displayed picture is now available as the separate experimental `/#/picture` mode. See `LIVE_PICTURE_REPORT.md` for its implementation, limitations and physical-device checklist. The uploaded-photo workflow below remains available.

Photo Preview already supports perspective placement of a gate on an entrance photograph. Android's previous combined picker used `capture="environment"` even when selecting an existing image, which could route directly to the camera.

## Updates

- Added `src/ui/EntrancePhotoPicker.tsx`: separate saved-image input without a capture constraint and rear-camera input with `capture="environment"`.
- Used the picker in `src/photo/PhotoPage.tsx` and `src/detection/OpeningDetection.tsx`. Both input paths use the existing validated image decoder, worker processing and four-corner editor. Both are disabled when their workflow is busy; pre-AR capture remains disabled during XR.
- Added a direct **Use an entrance image** link on the idle Live Preview screen and explained printed/displayed reference pictures in Compatibility & Help.
- Added `src/ui/EntrancePhotoPicker.test.tsx` for separate gallery/camera behavior, image delivery and disabled states.

## Use

1. Redeploy the updated source to Hostinger, then reload the HTTPS website.
2. Open Photo Preview or **Use an entrance image** from Live Preview.
3. Choose an entrance JPG/PNG/WebP from files, or take a photograph. You may photograph an entrance picture displayed on another screen or printed on paper.
4. Upload/select the gate. Choose **Suggest opening**, review/correct the corners, or **Mark manually** in TL/TR/BR/BL order. No rectangle is substituted for failed detection.
5. Adjust fit, size, brightness and opacity. Compare before/after, export the actual composite, or save locally.

Photo mode does not need surface scanning. This is a 2D perspective composite, not tracked image-target AR. Pointing the immersive camera at an arbitrary entrance picture does not reconstruct its original real-world entrance or establish a calibrated 3D plane. Existing real-entrance AR placement remains available separately. Automatic geometric proposals are not guaranteed for every image.

## Validation

`npm run typecheck`, `npm run lint`, `npm test` (27 files, 129 tests), and `npm run build` passed. Actual Samsung M34 file-picker presentation and camera behavior remain unverified; Android chooses the capture application/UI.
