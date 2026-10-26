# Stage 3 — Real 2D gate placement

Completed inside the existing `D:\GateVisualizer` project, without recreating it or changing dependencies. The supplied Stage 2 baseline is retained, including the selectable diagnostic cube. **Stage 3 physical-device behavior remains UNVERIFIED here**; automated checks do not establish real-world calibration accuracy.

## Implementation

Gate mode is the default. `/gates/gate-01.png` loads locally; it is an explicitly marked copy of the original transparent placeholder, not a real product photograph. Local PNG/JPG/WebP uploads support replacement in the active session. MIME, size and decoded dimensions are validated; decode errors retain the prior image. Object URLs are revoked on replacement, failure, stale completion or unmount. No upload endpoint/service is used.

A bottom-centered XY plane uses an HTML-image-backed sRGB texture with standard UVs and flipY=true, transparent material, a small alpha-test threshold, double-sided rendering and no transparent depth writes. The gate stays upright along world +Y. Its image is contained without cropping/stretching inside the entered metric width/height envelope; the actual fitted dimensions are shown. A uniform scale multiplier is explicit. Transparent artwork margins count toward those dimensions. JPG opacity is retained; this implementation does not remove backgrounds.

Calibration captures two separate real XR spatial hits at the left and right inner pillar bases. Their horizontal baseline defines yaw, their midpoint defines horizontal placement, the left base defines initial elevation, and gravity-aligned world +Y defines vertical. Width/height remain user-entered measurements, not dimensions silently inferred from hits. Duplicate/too-close/distant points or base-height differences over 25 cm are rejected. A floor hit alone, or four image-space corners, is not treated as a calibrated vertical entrance.

The anchor is created at the second spatial sample when available. A relative calibration transform preserves the entrance basis relative to that anchor; otherwise session-scoped world coordinates are retained. Native anchor pose corrections continue to apply while keeping the gate upright. World X/Z offsets, elevation, yaw and uniform scale support live visual alignment. Controls are available in the optional native DOM overlay, not as a screen-fixed gate image.

Image replacement preserves the world/anchor transform, dimensions, offsets, yaw and lock. A changed image aspect alters the contained visual size. Lock protects transformation edits, reposition and native taps while allowing image replacement. Unlock restores editing. Reposition clears placement/base samples and offsets but retains dimensions/scale/image. Reset clears placement, restores estimated defaults and retains the selected image. Exit uses the retained session teardown.

Missing/emulated positional tracking or a hidden session suppresses the gate. Missing anchor poses also hide it. Recovery restores the same placement, and reference-space reset clears calibration and unlocks. Visible tracking status is kept outside the collapsed diagnostics panel. No second camera stream, CSS camera simulation, automatic detection, 3D gate model or paid service is introduced.

## Files

Created:

- `public/gates/gate-01.png`: original local placeholder copied to the required default path.
- `src/geometry/calibration.ts`: aspect fit, metric defaults/validation, entrance basis and world adjustments.
- `src/gates/loadImage.ts`, `src/gates/useGateImage.ts`: decode/validation and local image lifecycle.
- `src/ui/GateControls.tsx`: measurements, world adjustments, actual size and image replacement.
- `src/geometry/calibration.test.ts`, `src/gates/loadImage.test.ts`, `src/gates/useGateImage.test.ts`, `src/xr/rendering.test.ts`, `src/ui/GateControls.test.tsx`.
- `STAGE3_REPORT.md`.

Modified:

- `src/xr/session.ts`: gate-mode two-point calibration, calibrated/anchor transforms, lock and retained diagnostic-mode behavior.
- `src/xr/rendering.ts`: gate mesh/texture configuration and resource disposal, alongside the existing marker/reticle.
- `src/xr/useXRSession.ts`: image/calibration bridge, mode selection and reset/reposition/lock actions.
- `src/xr/session.test.ts`: Stage 3 session cases in addition to all original Stage 2 cases.
- `src/geometry/gatePlane.ts`: upright bottom-center origin and normal UVs.
- `src/gates/assets.ts`: default gate-01 path/placeholder metadata.
- `src/preview/GatePreview.tsx`: selected-image preview.
- `src/ui/CapabilityPanel.tsx`, `src/App.tsx`, `src/styles.css`: Stage 3 instructions, controls and compact optional-overlay layout.
- `public/gates/README.md`: new default asset provenance and image preparation guidance.
- `README.md`: exact Stage 3 Android calibration, limits and retained Stage 2 acceptance/deployment guidance.

Preserved: original placeholder, generator, dependencies/lockfile/scripts/configuration, capability detection, native XR session request and animation loop, reference spaces, hit-test/anchor fallbacks, lifecycle cleanup and historical reports. Stage 2's one-tap diagnostic marker/reset remains available by selecting its mode before entry.

## Commands and results

Inspected existing files with `rg` and `Get-Content`, consulted primary Three.js texture/plane/material documentation, and copied the original PNG to the requested gate-01 path. No dependency installation was needed. An initial image-hook lint issue was fixed by loading initial assets through asynchronous completion callbacks. Repeated checks after implementation:

| Command | Final result |
| --- | --- |
| `npm run typecheck` | PASS — strict TypeScript |
| `npm run lint` | PASS — zero errors/warnings |
| `npm test` | PASS — 8 test files, 64 tests |
| `npm run build` | PASS — no build warnings |
| `npm exec vite -- preview --host 127.0.0.1 --port 4173` + `Invoke-WebRequest` | PASS — page, both gate PNGs, CSS, app JS and deferred renderer JS return HTTP 200 with expected MIME types |

Final output: HTML 0.54 kB; CSS 13.37 kB; app/common JS 423.71 kB (125.48 kB gzip); deferred renderer JS 353.40 kB (85.28 kB gzip). Preview server stopped after smoke testing.

Tests include all retained Stage 2 lifecycle cases plus vertical plane bounds/normal/UVs, finite-positive geometry, wide/tall/square aspect containment, two-spatial-point direction and midpoint, world-axis offsets and upright anchor compensation, valid control ranges, true two-capture state transitions, inconsistent/duplicate bases, stable gate transforms under viewer motion, anchors/lock/replacement, no-texture placement refusal, explicit manual fallback, local decoding errors, file limits, stale uploads and URL cleanup, material/texture setup and disposal, measured-input events and locked-image controls. XR/WebGL/image decoding boundaries are mocked; these tests do not exercise a real Android camera, GPU or tracking runtime.

## Exact calibration and handoff

Follow **Exact Android gate calibration — Stage 3 UNVERIFIED** in README.md. Measure width/height with a tape; enter them with scale 1; capture LEFT then RIGHT inner pillar bases with the teal center-view reticle; compare XR span with tape width; adjust world X/Z, base height and yaw while viewing both pillars and from the side; verify movement stability; Lock Placement. Replacing an image retains that calibration. Test alpha/orientation using asymmetric tightly cropped artwork.

Trusted HTTPS and xr-spatial-tracking Permissions-Policy requirements are unchanged; the existing Nginx/USB-forwarding examples remain in README.md. No deployment was performed.

## Limits requiring Android acceptance

- Native DOM overlay is needed for in-session numeric edits, image replacement and locking. Without it, gate mode still captures bases with native selects; the retained diagnostic cube works, and Chrome provides native exit, but the full gate alignment workflow cannot be completed live. This limitation is shown before entry.
- Android's upload picker can interrupt/end XR depending on Chrome/device behavior. The code retains placement if the session survives; a new session always requires new spatial calibration. This interaction needs device testing.
- With no hit-test source, the approximate gate starts 1.5 m ahead at viewer height and needs manual depth/height/yaw alignment. It is explicitly not depth-calibrated. No automatic floor/entrance inference is claimed.
- The chosen artwork must have appropriate proportions; aspect preservation means mismatched artwork cannot fill both measured dimensions simultaneously. The local placeholder includes transparent padding.
- No automatic pillar occlusion, perspective correction, cross-session persistence, absolute surveying accuracy or drift tolerance is guaranteed. Lock protects editing, not tracking accuracy. The user must verify both edges and depth from multiple physical viewpoints.
- Browser visual QA, real PNG/JPG/WebP decode/GPU appearance, file-picker behavior, native overlay interaction and physical alignment remain hardware acceptance items. The user's Stage 2 verification is not presented as verification of these new Stage 3 behaviors.

Stopped at Stage 3.
