import { describe, expect, it } from 'vitest';
import { adjustedChannel, defaultPresentation, validPresentation } from './presentation';
describe('manual gate appearance', () => {
  it('defaults to neutral sRGB appearance and validates bounds', () => {
    expect(validPresentation(defaultPresentation)).toBe(true);
    for (const value of [0, 0.1, 0.5, 1]) expect(adjustedChannel(value, defaultPresentation)).toBeCloseTo(value);
    expect(validPresentation({ ...defaultPresentation, opacity: -1 })).toBe(false);
    expect(validPresentation({ ...defaultPresentation, contrast: NaN })).toBe(false);
    expect(validPresentation({ ...defaultPresentation, exposure: 3 })).toBe(false);
  });
  it('adjusts brightness/exposure and clamps output without claiming measured lighting', () => {
    expect(adjustedChannel(0.5, { ...defaultPresentation, exposure: 1 })).toBeGreaterThan(0.5);
    expect(adjustedChannel(0.5, { ...defaultPresentation, brightness: 0.5 })).toBeLessThan(0.5);
    expect(adjustedChannel(1, { ...defaultPresentation, brightness: 2, exposure: 2 })).toBe(1);
  });
});
