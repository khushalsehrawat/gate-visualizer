# Calmer tracking recovery

- Removed device-testing wording from routine start, placement, reset and exit messages. The physical-device UNVERIFIED notice remains static in Fine Tune; it is not the tracking state.
- Added `src/xr/recovery.ts`, a presentation-only recovery state machine. Initial acquisition says Finding Surface. After a real pose interruption, the customer sees Reconnecting until valid poses have remained continuous for 350 ms; sustained missing poses offer Hold still to reconnect after 1.5 s. Brief alternating valid/missing frames no longer repeatedly announce Gate Placed and tracking failure.
- The state machine does not drive Three.js matrices, retain missing poses, enable placement or change hit-test timing. Real reticle updates remain immediate. A lost actual gate pose still hides the gate immediately, and the committed world placement is retained for recovery. Device hardware tracking limitations are unchanged.
- Updated `src/xr/session.ts`, `src/LivePreview.tsx` and regression tests. Recovery state resets on reset/teardown; no timers, streams or additional sessions are introduced.

Validation: `npm run typecheck`, `npm run lint`, `npm test` (**36 files, 167 tests**), and `npm run build` passed. Physical Samsung M34 behavior remains UNVERIFIED.

Deploy the complete newly built `dist` output on Hostinger. Open `https://YOUR-DOMAIN/?v=tracking-recovery-20261027#/live` to request a fresh document instead of returning to an already-open old tab. The query parameter only bypasses a cached document; it does not enable a fake tracking mode or erase local saved previews. The exact old wording “Tracking (device UNVERIFIED)” is absent from current operational tracking code; seeing it on the primary live screen indicates a previous deployed/cached UI.

Android acceptance: place a gate, briefly interrupt tracking, then return to the same entrance. Reconnecting should stay calm during short recovery bursts; the gate must hide whenever its real pose is unavailable. After stable real poses return, Gate Placed should reappear at the same location. Prolonged loss must show guidance, not pretend tracking is valid. Check reset, exit and restart as well.
