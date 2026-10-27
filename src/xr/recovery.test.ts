import { expect, it } from 'vitest';
import { TrackingRecoveryNotice } from './recovery';
it('does not call initial surface acquisition a device failure and accepts the first actual pose immediately', () => {
  const notice = new TrackingRecoveryNotice();
  expect(notice.update(false, 0)).toBe('searching'); expect(notice.update(false, 5000)).toBe('searching');
  expect(notice.update(true, 5016)).toBe('active');
});
it('keeps a calm recovery label across brief valid/invalid bursts without delaying physical pose data', () => {
  const notice = new TrackingRecoveryNotice(); notice.update(true, 0);
  expect(notice.update(false, 16)).toBe('recovering'); expect(notice.update(true, 32)).toBe('recovering');
  expect(notice.update(false, 48)).toBe('recovering'); expect(notice.update(true, 64)).toBe('recovering');
  expect(notice.update(true, 400)).toBe('recovering'); expect(notice.update(true, 414)).toBe('active');
});
it('offers sustained-loss guidance and resets cleanly between sessions', () => {
  const notice = new TrackingRecoveryNotice(); notice.update(true, 0); notice.update(false, 16);
  expect(notice.update(false, 1516)).toBe('paused');
  expect(notice.update(true, 1600)).toBe('recovering'); expect(notice.update(true, 1950)).toBe('active');
  notice.reset(); expect(notice.update(false, 5000)).toBe('searching'); expect(notice.update(true, 5016)).toBe('active');
});
