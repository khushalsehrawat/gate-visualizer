import { describe, expect, it } from 'vitest';
import type { Quad } from '../detection/geometry';
import { trackedOpening } from './tracking';
const q: Quad = [{ x: 80, y: 80 }, { x: 320, y: 80 }, { x: 320, y: 240 }, { x: 80, y: 240 }];
const spread = [...q, { x: 120, y: 100 }, { x: 240, y: 120 }, { x: 260, y: 200 }, { x: 100, y: 220 }];
const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
describe('picture target geometric evidence', () => {
  it('projects a matched opening rather than keeping a screen-fixed rectangle', () => {
    const result = trackedOpening([1, 0, 10, 0, 1, 5, 0, 0, 1], q, 400, 300, 12, 10, spread)!;
    expect(result[0]).toEqual({ x: 90 / 400, y: 85 / 300 });
    expect(result[2]).toEqual({ x: 330 / 400, y: 245 / 300 });
  });
  it('rejects too few matches, low inlier ratio and clustered evidence', () => {
    expect(trackedOpening(identity, q, 400, 300, 9, 8, spread)).toBeNull();
    expect(trackedOpening(identity, q, 400, 300, 20, 8, spread)).toBeNull();
    expect(trackedOpening(identity, q, 400, 300, 12, 10, spread.map(() => ({ x: 100, y: 100 })))).toBeNull();
  });
  it('rejects singular, nonfinite, inverted and offscreen mappings', () => {
    for (const matrix of [[1, 0, 0, 0, 1, 0, 0, 0, 0], [NaN, ...identity.slice(1)], [-1, 0, 400, 0, 1, 0, 0, 0, 1], [1, 0, 400, 0, 1, 0, 0, 0, 1]]) {
      expect(trackedOpening(matrix, q, 400, 300, 12, 10, spread)).toBeNull();
    }
  });
});
