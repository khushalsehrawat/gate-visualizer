import { describe, expect, it } from 'vitest';
import { heuristicScore, lineIntersection, orderCorners, validateQuad } from './geometry';
import type { Quad } from './geometry';
const quad: Quad = [{ x: 0.15, y: 0.2 }, { x: 0.8, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.1, y: 0.8 }];
describe('opening candidate geometry', () => {
  it('orders shuffled corners TL, TR, BR, BL without duplicating a point', () => {
    expect(orderCorners([quad[2], quad[0], quad[3], quad[1]])).toEqual(quad);
    expect(validateQuad(quad)).toBeNull();
  });
  it('rejects missing, nonfinite, repeated, collinear and self-crossing corners', () => {
    expect(orderCorners([{ x: NaN, y: 0 }])).toBeNull();
    expect(validateQuad(quad.slice(0, 3))).not.toBeNull();
    expect(validateQuad([quad[0], quad[1], quad[1], quad[3]])).not.toBeNull();
    expect(validateQuad([{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.3 }, { x: 0.5, y: 0.5 }, { x: 0.7, y: 0.7 }])).not.toBeNull();
    expect(validateQuad([quad[0], quad[2], quad[1], quad[3]])).not.toBeNull();
    expect(validateQuad([{ x: Infinity, y: 0.2 }, ...quad.slice(1)])).not.toBeNull();
  });
  it('rejects tiny, outside, whole-photo and extreme-aspect proposals', () => {
    expect(validateQuad(quad.map((p) => ({ x: p.x / 10, y: p.y / 10 })))).not.toBeNull();
    expect(validateQuad([{ x: -0.1, y: 0.2 }, ...quad.slice(1)])).not.toBeNull();
    expect(validateQuad([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }])).not.toBeNull();
    expect(validateQuad([{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.2, y: 0.9 }, { x: 0.1, y: 0.9 }])).not.toBeNull();
  });
  it('computes genuine line intersections and rejects parallel lines', () => {
    expect(lineIntersection({ a: { x: 2, y: 0 }, b: { x: 2, y: 5 } }, { a: { x: 0, y: 3 }, b: { x: 5, y: 3 } })).toEqual({ x: 2, y: 3 });
    expect(lineIntersection({ a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }, { a: { x: 0, y: 1 }, b: { x: 1, y: 1 } })).toBeNull();
  });
  it('scores geometric evidence as a capped heuristic', () => {
    expect(heuristicScore(quad, 0.9, 1, 1)).toBeGreaterThan(heuristicScore(quad, 0.2, 1, 1));
    expect(heuristicScore(quad, 1, 1, 1)).toBeLessThanOrEqual(95);
  });
});
