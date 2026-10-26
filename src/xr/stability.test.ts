import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { WorldPoseFilter } from './stability';
describe('world-anchor correction filter', () => {
  it('filters small world corrections independently of any camera pose', () => {
    const filter = new WorldPoseFilter();
    filter.update(new Matrix4().makeTranslation(1, 0, -2), 0, true);
    const corrected = filter.update(new Matrix4().makeTranslation(1.1, 0, -2), 16, true);
    const position = new Vector3().setFromMatrixPosition(corrected);
    expect(position.x).toBeGreaterThan(1); expect(position.x).toBeLessThan(1.1);
    expect(position.z).toBe(-2);
  });
  it('snaps on recovery/reset, large discontinuities or disabled filtering', () => {
    const filter = new WorldPoseFilter(); const target = new Matrix4().makeTranslation(2, 0, 0);
    filter.update(new Matrix4(), 0, true);
    expect(filter.update(target, 16, true).equals(target)).toBe(true);
    filter.reset(); const recovered = new Matrix4().makeTranslation(2.1, 0, 0);
    expect(filter.update(recovered, 32, true).equals(recovered)).toBe(true);
    const manual = new Matrix4().makeTranslation(2.2, 0, 0);
    expect(filter.update(manual, 48, false).equals(manual)).toBe(true);
  });
});
