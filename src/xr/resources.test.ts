import { expect, it } from 'vitest';
import { acquireXR, trackXRSession, trackHitSource, releaseHitSource, xrResourceCounts } from './resources';
it('counts actual native sessions/sources until their respective lifecycle ends', () => {
  const xr = {}, release = acquireXR(xr)!;
  const session = new EventTarget() as XRSession;
  let cancelled = 0; const source = { cancel: () => { ++cancelled; } } as XRHitTestSource;
  trackXRSession(session, release); trackHitSource(source);
  expect(xrResourceCounts()).toEqual({ sessions: 1, hitSources: 1 }); expect(acquireXR(xr)).toBeNull();
  releaseHitSource(source); expect(cancelled).toBe(1); expect(xrResourceCounts().hitSources).toBe(0);
  session.dispatchEvent(new Event('end')); expect(xrResourceCounts().sessions).toBe(0);
  const nextOwner = acquireXR(xr)!; release(); expect(acquireXR(xr)).toBeNull(); nextOwner();
});
