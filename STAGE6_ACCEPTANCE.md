# Stage 6 — Complete manual customer journey

Run `npm ci`, `npm run build`, and serve **all** of `dist/` over trusted HTTPS. For local desktop checks use `npm exec vite -- preview --host 127.0.0.1 --port 4173`. Android testing needs the retained trusted-HTTPS/forwarded-localhost setup in README.md. These steps are manual acceptance, not a claim they were all tested on physical Android.

Record device/OS/browser/version, URL, viewport, storage mode, results (PASS/FAIL/NOT EXERCISED), screenshots and console errors. Use a real entrance photograph and licensed/asymmetric gate artwork, plus invalid/dark/blank fixtures. Catalogue assets are illustrative placeholders.

## 1. Home and navigation

1. Open the root URL and `#/home`. Confirm the exact headline **See Your Gate Before It's Installed.**, ivory/charcoal layout, architectural photograph and its inspiration caption. No camera/session prompt should appear automatically.
2. On supported Android Chrome, wait for native support detection and confirm Start Live Preview is the primary action. On a non-AR desktop/iPhone/unsupported browser, confirm Photo Preview is prioritized and compatibility help remains available. No fake AR view should appear.
3. Check all seven routes: Home, Live Preview, Gate Catalogue, Upload Your Gate, Photo Preview, Saved Previews, Compatibility & Help. Refresh each URL; use browser Back/Forward. Unknown routes should offer Return home.
4. At 320, 390, 768 and 1440 px widths, check no horizontal page overflow, readable text and usable controls. Open/close mobile Menu and select a route. Keyboard-test Skip to content, navigation, details, forms, sliders and focus outlines. Route changes should focus the visible heading. Enable reduced-motion preference and confirm decorative transitions stop.

## 2. Catalogue and gate upload

5. Filter All, Modern, Minimal, Horizontal Slat, Vertical Slat, Laser Cut, Classic and Luxury. Check matching cards, illustrative labels and selected-design state. Select a gate, then open Photo Preview and Live Preview: the shared selection should remain. No purchase/customer/testimonial claims should be implied.
6. On Upload Your Gate, choose a transparent PNG, WebP and opaque JPG. Check successful decode and truthful alpha behavior. Use both preview links. Test unsupported format, corrupt file, >10 MB and >4096 px gate: errors should explain the limit and retain the previous working design.
7. Switch designs quickly. Final selection must win; stale decodes must not revert it. Photo corner/settings and active AR placement must not reset merely because the image changed.

## 3. Photo Preview

8. On `#/photo`, verify the empty state and both photo pickers. Capture a photo on a mobile device or select an existing JPG/PNG/WebP (up to 20 MB). Accept/cancel camera permissions/file picker. Cancellation must not fabricate a photo or opening. Test corrupt/oversize images. Confirm orientation and aspect; working photo/export size is capped at 1600 px on its longest side.
9. Click Suggest opening. First use loads the self-hosted OpenCV WASM in a worker. Test a clear rectangular entrance, window/distractor, dark photo, low contrast, clutter and no opening. Candidate scores must be labeled heuristic—not probabilities or semantic recognition. Failures must leave no default rectangle. Cancel detection and confirm manual editing remains available.
10. Choose Mark manually. Tap **TL → TR → BR → BL**. Drag handles, choose a corner and nudge it using the magnifier. Cross/overlap points, collapse an edge or move to invalid geometry: export/save must become unavailable. Correct the points and verify rendering recovers. No image points should claim real-world depth or a 3D anchor.
11. With four valid corners, confirm the **actual photo composite** appears. Use an oblique opening/asymmetric artwork: gate edges and internal lines should follow a projective homography, not just a rotated bounding box. Transparent holes must show the house; JPG backgrounds remain. No foreground occlusion or physical shadows are invented.
12. Adjust gate size, horizontal/vertical position, opacity, brightness, layout width/height and Fit/Crop/Proportional. Check crop bottom alignment and source aspect behavior. Layout dimensions determine a 2D fitting ratio; estimated defaults do not establish metric depth. Updates should not block scrolling/controls; invalid or pending renders must not enable export of a stale composite.
13. Use Hide guides for a clean review; Edit corners restores handles/magnifier. Show before/after: Before is the original entrance photograph, After is the gate composite at the same points/settings. Export composited image; inspect the downloaded PNG. It must include the actual house **and** gate at the chosen perspective/opacity/crop/brightness, with no editor handles or labels. It must not silently export only the gate or original image.
14. Leave Photo Preview for Catalogue or Help, then return. The unsaved draft should remain in the current tab. Switching to Live Preview must not start a second camera stream; page navigation is blocked while native AR is requesting/active/ending, until explicit exit.

## 4. Saved Previews — local persistence

15. Name the project and Save on this device. Check a success state only after the IndexedDB transaction completes. Go to Saved Previews and inspect the actual composite thumbnail, name and chosen gate. First use without records must show the real empty state.
16. Rename and cancel rename; then save a new name. Refresh the browser/tab and confirm the record remains. Open it and verify the original working photo, embedded gate image, all four points and settings are restored. No XR session/anchor should be created or claimed. Change opacity/corners, Update saved preview and reopen again to verify updates.
17. Export from the saved card and compare with its stored composite. Delete → Keep preview should preserve it; Delete → Yes, delete preview should remove it. Refresh to verify deletion. Reopen a deleted/missing record should fail clearly, not substitute another design or default preview.
18. Test private browsing, blocked IndexedDB/full storage where feasible. Saving must fail visibly without claiming success; PNG export remains an alternative. Retry local storage after resolving the condition. Clearing browser storage may remove records—there is no cloud/cross-device backup. Photos, gate blobs, composite and settings are bundled in saved projects; a bare unsaved gate upload is only a tab draft.

## 5. Live Preview — preserve real AR

19. On supported Android 12+/ARCore Chrome over trusted HTTPS, enter Live Preview with a selected design. Confirm native capability/error states and a gesture-only Start AR. Deny then allow permission. Real immersive AR should open through the retained engine; no static screen overlay replaces it.
20. Enter tape measurements, scan, capture real left/right pillar bases, adjust from multiple viewpoints and lock. Walk sideways/nearer/farther. The gate must stay in world space. Check gate replacement, fitting/appearance controls, before/after, tracking loss/recovery, Reposition, Reset, reference reset, native Exit and repeated sessions using the Stage 5 checklist in README.md.
21. During native AR, verify root navigation/photo capture cannot start another workspace/camera. Exit first, then use Photo Preview. Leaving/closing the application still uses native session cleanup. On no-DOM-overlay devices, native tap placement/Chrome exit remain available; the full live numeric workflow requires overlay support.
22. Confirm AR export remains honestly gate-only. Photo export is the actual 2D composite. Native Android screenshots may include or omit passthrough depending on Chrome/OS; no in-app passthrough capture, real occlusion, shadow accuracy or cross-session anchor persistence is promised.

## 6. Help, privacy and performance

23. Open every Help question. Verify current capability information, photo fallback guidance, calibration instructions, local-storage/eviction limits, image credits and capture limitations. Check all footer and inline links.
24. After repeated photo uploads/detection/rendering, catalogue switches, saves and AR exits, check remote console and performance/resource diagnostics. Old workers, texture resources, canvases, URLs and listeners should be released. Record actual phone latency, memory pressure and frame behavior; desktop browser tests are not an Android performance guarantee.

Accept Stage 6 only after the relevant physical-device paths are recorded. Automated checks and isolated Chrome results are documented separately in STAGE6_REPORT.md.
