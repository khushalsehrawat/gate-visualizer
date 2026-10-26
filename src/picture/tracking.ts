import { validateQuad } from '../detection/geometry';
import type { Point, Quad } from '../detection/geometry';
import { project } from '../photo/projective';
import type { Homography } from '../photo/projective';

export function trackedOpening(matrix: number[], original: Quad, width: number, height: number, matches: number, inliers: number, spread: Point[]): Quad | null {
  if (matrix.length !== 9 || matrix.some((v) => !Number.isFinite(v)) || matches < 10 || inliers < 8 || inliers / matches < 0.6 || spread.length < 8) return null;
  for (const axis of ['x', 'y'] as const) {
    const range = (points: Point[]) => Math.max(...points.map((p) => p[axis])) - Math.min(...points.map((p) => p[axis]));
    if (range(spread) < range(original) * 0.25) return null;
  }
  try {
    const denominators = original.map((p) => matrix[6]! * p.x + matrix[7]! * p.y + matrix[8]!);
    if (denominators.some((d) => Math.abs(d) < 1e-6 || Math.sign(d) !== Math.sign(denominators[0]!))) return null;
    const corners = original.map((p) => project(matrix as Homography, p.x, p.y)) as Quad;
    if (validateQuad(corners, width, height, true)) return null;
    return corners.map((p) => ({ x: p.x / width, y: p.y / height })) as Quad;
  } catch { return null; }
}
