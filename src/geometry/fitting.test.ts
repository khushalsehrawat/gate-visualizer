import { describe, expect, it } from 'vitest';
import { gateLayout } from './fitting';
describe('professional metric gate fitting', () => {
  it('fits the full image bottom-centered without cropping', () => {
    expect(gateLayout(3, 2, 1600, 800, 'fit')).toEqual({ width: 3, height: 1.5, repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 });
  });
  it.each([[1600, 800], [800, 1600], [1000, 1000]])('fills the exact opening using undistorted UV crop: %s × %s', (w, h) => {
    const layout = gateLayout(3, 2, w, h, 'crop');
    expect(layout.width).toBe(3); expect(layout.height).toBe(2);
    expect(w * layout.repeatX / (h * layout.repeatY)).toBeCloseTo(3 / 2);
    expect(layout.repeatX).toBeGreaterThan(0); expect(layout.repeatY).toBeGreaterThan(0);
    expect(layout.offsetX + layout.repeatX).toBeLessThanOrEqual(1);
    expect(layout.offsetY).toBe(0);
  });
  it('uses measured width and natural proportional height, including intentional overflow', () => {
    const layout = gateLayout(3, 1, 600, 800, 'proportional');
    expect(layout.width).toBe(3); expect(layout.height).toBe(4);
    expect(layout.repeatX).toBe(1); expect(layout.repeatY).toBe(1);
  });
  it('applies uniform scale to world dimensions without changing crop', () => {
    const full = gateLayout(3, 2, 1600, 800, 'crop'); const half = gateLayout(3, 2, 1600, 800, 'crop', 0.5);
    expect(half.width).toBe(full.width / 2); expect(half.height).toBe(full.height / 2);
    expect(half.repeatX).toBe(full.repeatX);
  });
  it('rejects invalid/overflowing aspect and scale instead of producing degenerate planes', () => {
    expect(() => gateLayout(3, 2, 0, 100, 'fit')).toThrow();
    expect(() => gateLayout(3, 2, 100, 100, 'fit', NaN)).toThrow();
    expect(() => gateLayout(3, 2, Number.MAX_VALUE, Number.MIN_VALUE, 'fit')).toThrow();
  });
});
