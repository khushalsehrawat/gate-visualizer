# Stage 6 visual assets

## Architectural inspiration photograph

- Local file: `public/images/architecture.jpg` (1800 px delivery, approximately 364 kB).
- Downloaded image: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=85
- Source: Unsplash photograph identifier `photo-1600596542815-ffad4c1539a9`.
- License verified October 26, 2026: [Unsplash License](https://unsplash.com/license), which permits downloading, copying, modifying and using images, including commercially, subject to its stated restrictions.
- Used as architectural inspiration, explicitly identified as **not a GateVisualizer client project or generated preview**. The photograph shows a contemporary white residence and pool. No photographer name or architectural-project attribution has been invented.
- The delivered file is self-hosted; customers do not load it from an external image service. No Unsplash API, credentials or paid service is used.

## Gate artwork

`public/gates/gate-01.png` through `gate-07.png` are original procedural, flat 2D placeholders. The initial assets and generators are preserved; Stage 6 extends `scripts/generate-catalogue.mjs` with Minimal, Laser Cut, Classic and Luxury studies. The generator writes gate-02 through gate-07, so do not run it over replacement product artwork you want to preserve.

Catalogue cards explicitly label these as illustrative designs. Categories are style groupings, not vendor inventory or offers to sell a manufactured gate. Customer uploads must be artwork they have permission to use. Images are not given fake thickness, depth, material finishes or manufacturing claims.

## Other dependencies

OpenCV notices and its Apache-2.0 license remain in `THIRD_PARTY_NOTICES.md` and `public/third-party/opencv-LICENSE.txt`. Stage 6 adds only the development-only `fake-indexeddb` testing dependency, not a runtime backend.
