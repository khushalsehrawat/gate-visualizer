import { expect, it } from 'vitest';
import { PictureHealth } from './health';
import type { Quad } from '../detection/geometry';
const corners: Quad = [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .9 }, { x: .1, y: .9 }];
it('keeps brief interruptions from flashing status without retaining an untracked gate', () => {
  const health = new PictureHealth();
  const matched = health.accept(corners, 0, 100);
  expect(matched.visible).toBe(true);
  const gap = health.accept(null, 200, 300);
  expect(gap.visible).toBe(false); expect(gap.message).toBe(matched.message);
  expect(health.accept(null, 1300, 1300).message).toMatch(/Picture not matched/);
});
it('rejects old or future evidence and can reacquire a valid picture', () => {
  const health = new PictureHealth();
  expect(health.accept(corners, 0, 501).visible).toBe(false);
  expect(health.accept(corners, 800, 700).visible).toBe(false);
  expect(health.accept(corners, 900, 1000).visible).toBe(true);
});
