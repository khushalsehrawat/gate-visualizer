# Stage 6 — Customer website and real photo fallback

Completed in the existing `D:\GateVisualizer` project. No backend, paid API, account or deployment was added. The real WebXR implementation was retained; it was not replaced with a static scene or camera overlay. Stop boundary: **Stage 6**.

## Customer-facing experience

Seven hash routes provide Home, Start Live Preview, Gate Catalogue, Upload Your Gate, Photo Preview, Saved Previews, and Compatibility & Help. The home headline is exactly **See Your Gate Before It's Installed.** Native immersive-ar support determines whether Live Preview or Photo Preview is the primary customer action. Unsupported devices can still reach compatibility guidance and the real disabled/error states.

The ivory/charcoal visual system uses editorial serif headings, refined spacing, locally hosted architectural photography, restrained transitions, reduced-motion support, responsive navigation, visible focus and a working skip link. All links/buttons lead to implemented routes/actions. The hero photograph is licensed architectural inspiration, explicitly not a client project or app-generated result. Catalogue artwork is original and clearly labeled illustrative; all seven requested categories exist. See ASSET_LICENSES.md.

Gate selection is shared across catalogue, upload, photo and live workspaces through a provider. Original gate-01 and the prior horizontal/vertical assets are preserved, with four new placeholder designs. Fast switching retains current photo corners/settings and the live engine's placement behavior. Decode failures retain the previous working image. There are no invented prices, customers, testimonials or manufactured-product claims.

## Real photo mode

- Capture/select an entrance image (PNG/JPG/WebP, up to 20 MB), decode orientation, and preserve a working/export resolution of at most 1600 px on the longest side.
- Select/upload the gate image using the shared library. Existing alpha is retained; JPG backgrounds are not removed. Photo working gate rasters are bounded to 2048 px to limit memory, independently of existing Live image limits.
- Request OpenCV geometric opening suggestions, or manually mark TL/TR/BR/BL. Detection uses a separate max-960 px input, heuristic scores and truthful failure states. No default rectangle is inserted as a success. Existing 44 px handles, magnifier and nudge controls are reused; Hide guides provides a clean review.
- Solve an eight-unknown projective homography, invert it for destination-pixel mapping, apply the existing Fit/Crop/Proportional layout in opening coordinates, and bilinearly sample the source gate with premultiplied-alpha interpolation. Size, offsets, opacity and brightness are adjustable. This is a full planar perspective transformation, not a rotated/stretched DOM bounding box.
- Run expensive compositing in a cancellable worker, debounce updates and ignore stale results. Invalid/singular/horizon-crossing geometry reports an error. Save/export are guarded against incomplete points, pending render, detection and source loading.
- Before shows the original processed house image; After shows the actual composite. The exported PNG is that house-and-gate image, without editor controls. Save/export always use After, regardless of temporary comparison view. No 2D image or homography is presented as metric depth, a 3D anchor, foreground occlusion or physical lighting.

## Local persistence

IndexedDB saves a versioned project containing the source photo blob, embedded gate blob, actual composite, normalized corners, fitting/appearance settings, names, dimensions and timestamps. A successful transaction completes before a success message. The source images and settings—not only a flattened thumbnail—are available for reopening/recomposition.

Saved Previews supports a real empty state, open, rename/cancel, export, delete/keep confirmation and retry after storage errors. Rename uses one read/write transaction. Reopen validates the record and decodes its embedded gate before returning to Photo Preview. Browser reload persistence was verified in actual Chrome. No XR pose/anchor is stored or restored. An unsaved tab draft remains through ordinary page navigation; standalone gate uploads are persisted when included in a saved project. Storage clearing, private browsing, quotas and eviction remain browser limitations; export is the backup path.

## WebXR preservation and camera boundaries

The session controller, gesture-driven requestSession, Three.js XR renderer, hit tests, native anchors/world reference spaces, metric calibration, live fitting/appearance, comparison, tracking recovery, profiling and cleanup remain the tested engine. The former workspace component now lives in `src/LivePreview.tsx` and consumes the shared gate library; all prior test cases remain passing against it.

Root navigation is guarded while AR is requesting/active/ending, preventing a separate photo picker/workspace from racing the immersive session. No getUserMedia stream is introduced. Native DOM-overlay safe areas and transparent root background are preserved; a browser CSS regression check explicitly verifies that the customer theme does not make the XR overlay opaque. This CSS check does not pretend to be an immersive tracking test.

The native AR engine still requires fresh real pillar-base hits/measurements for calibrated world placement. Photo projects do not promise cross-session XR anchor persistence. Live export remains gate-only, distinct from Photo Preview's actual composite export. Real depth/occlusion, physical shadows, gate thickness and verified passthrough screenshots remain unavailable as described in earlier reports.

## Files and tooling

Created:

- `src/LivePreview.tsx`: retained existing live workspace, moved from the prior root App.
- `src/gates/GateProvider.tsx`: shared image selection/provider.
- `src/site/Website.tsx`, `Home.tsx`, `Catalogue.tsx`, `UploadGate.tsx`, `SavedPreviews.tsx`, `Help.tsx`, `site.css`: customer navigation, pages and design system.
- `src/photo/projective.ts`, `model.ts`, `composite.ts`, `compositor.worker.ts`, `browser.ts`, `PhotoPage.tsx`: homography math, composition, browser I/O, worker lifecycle and editing/save flow.
- `src/storage/projects.ts`: IndexedDB storage, validation and transactional lifecycle.
- `src/photo/composite.test.ts`, `src/storage/projects.test.ts`, `src/site/Website.test.tsx`: math/alpha, storage and customer-journey integration tests.
- `scripts/browser-qa.mjs`: actual isolated-Chrome customer workflow driver.
- `public/images/architecture.jpg`, `public/gates/gate-04.png` through `gate-07.png`, `ASSET_LICENSES.md`.
- `STAGE6_ACCEPTANCE.md` and this report.

Modified:

- `src/App.tsx`, `src/main.tsx`, `index.html`: customer root, CSS and page metadata.
- `src/gates/useGateImage.ts`, `assets.ts`: reusable restore result and seven categorized designs; prior upload API remains compatible.
- `src/detection/photo.ts`, `OpeningEditor.tsx`: optional larger working image/blob and reusable composite display/guide visibility; existing default detection behavior retained.
- Previous App integration tests now wrap/test the retained LivePreview under its provider; their assertions and original functionality remain.
- `scripts/generate-catalogue.mjs`: additional original flat styles while retaining earlier designs.
- `.gitignore`, `eslint.config.js`: exclude isolated browser profile/cache from source/lint.
- `package.json`, `package-lock.json`: development-only fake-indexeddb; runtime dependencies unchanged.
- `README.md`: current routes, composition/persistence semantics, browser QA and complete customer-journey links.

All earlier stage reports, original gate assets and real XR modules remain in the project. The Sites skill was used in its existing-project/local-only workflow; no hosting registration/publication was performed.

## Validation

Commands run include inspection with rg/Get-Content, installation of development-only fake-indexeddb (zero reported vulnerabilities), local asset generation, all required checks, Vite production preview, and the actual Chrome QA script. No database/server infrastructure was installed.

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS — strict TypeScript |
| `npm run lint` | PASS — no lint errors/warnings |
| `npm test` | PASS — **23 files, 113 tests**, including every prior 106 case |
| `npm run build` | PASS — production build without warnings |
| `node scripts/browser-qa.mjs` | PASS — actual isolated desktop Chrome, desktop/mobile viewport checks and local customer journey |
| Production HTTP HEAD checks | PASS — HTML, photograph, all seven gate PNGs, styles, customer entry, both workers, deferred renderer/export helper, OpenCV and license return 200 with expected MIME types |

Integration tests verify all-four-corner homography correspondence and inverse mapping, alpha compositing over actual source pixels, fit/crop/proportional behavior, invalid geometry rejection, IndexedDB blob/settings save/read/update/rename/delete, route/category navigation, accessibility skip focus, device-aware action priority and no automatic XR launch.

The real Chrome driver (not jsdom) verifies 1440 px desktop and 390 px mobile viewports, no page overflow on all routes, native-theme overlay transparency, real OpenCV worker loading/execution, honest no-candidate response, four actual pointer-selected oblique corners, the compositing worker and Canvas PNG output, gate switching, 0.75 opacity, clean before/after, IndexedDB save → rename → reload → reopen with restored opacity → delete. It fetches the actual exported composite and writes it to an ignored QA artifact. No runtime exceptions were observed. The architectural fixture has no confirmed gate opening; the manually chosen region is only a QA geometry fixture, not claimed automatic recognition or a realistic installation.

Visual artifacts were inspected: `.browser-qa/home-desktop.png`, `home-mobile.png`, `photo-mobile.png`, and `composite.png`. These use a dedicated local Chrome profile, not a personal profile. The QA browser and preview server are closed after testing. The shipped app does not contain these QA projects or a prefilled fake saved list.

Production assets include the normal customer entry (~483 kB minified, ~143 kB gzip), deferred Three.js renderer (~354 kB), compositing worker (~5.75 kB), retained detector/OpenCV assets, locally hosted photograph (~364 kB), all seven small gate PNGs and licenses. OpenCV remains lazy and is not fetched by the homepage. New photo composition/export is browser-local.

## Manual customer journey and remaining limits

**STAGE6_ACCEPTANCE.md** is the complete 24-step manual checklist. It covers all seven pages, supported/unsupported AR devices, camera permissions/cancellation, category/upload switching, suggestion failures, four-corner correction, fit/appearance, true composite export, local save/reopen/rename/delete, storage denial, accessibility, active-AR navigation/camera guards and the retained physical AR journey.

Actual Android/iOS camera pickers, private-mode/quota behavior, native DOM-overlay touch ergonomics, live AR on physical hardware, physical drift/performance and Safari/Firefox still require target-device acceptance. Desktop mobile viewport emulation is not a physical Android AR test. Previously verified engine behavior was preserved; this report does not invent a fresh physical tracking result.

The photo model assumes a single planar opening and user-appropriate artwork/layout proportions. It cannot infer real depth, hide the gate behind unsegmented people/pillars, remove an opaque JPG background or provide physically correct shadows. Browser storage is local/evictable; exports are not cloud backup. No deployment or later stage is included.
