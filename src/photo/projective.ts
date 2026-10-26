import type { Point, Quad } from '../detection/geometry';
export type Homography = [number, number, number, number, number, number, number, number, number];
export function homography(quad: Quad): Homography {
  const source = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const rows: number[][] = [];
  source.forEach(({ x, y }, i) => {
    const p = quad[i]!;
    rows.push([x, y, 1, 0, 0, 0, -p.x * x, -p.x * y, p.x]);
    rows.push([0, 0, 0, x, y, 1, -p.y * x, -p.y * y, p.y]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row]![col]!) > Math.abs(rows[pivot]![col]!)) pivot = row;
    if (Math.abs(rows[pivot]![col]!) < 1e-10) throw new Error('Opening geometry is degenerate; separate the corners.');
    [rows[col], rows[pivot]] = [rows[pivot]!, rows[col]!];
    const divisor = rows[col]![col]!;
    for (let k = col; k <= 8; k++) rows[col]![k] = rows[col]![k]! / divisor;
    for (let row = 0; row < 8; row++) if (row !== col) {
      const factor = rows[row]![col]!;
      for (let k = col; k <= 8; k++) rows[row]![k] = rows[row]![k]! - factor * rows[col]![k]!;
    }
  }
  return [...rows.map((row) => row[8]!), 1] as Homography;
}
export function project(h: Homography, x: number, y: number): Point {
  const d = h[6] * x + h[7] * y + h[8];
  if (Math.abs(d) < 1e-10) throw new Error('Perspective crosses the horizon; reduce size or correct corners.');
  return { x: (h[0] * x + h[1] * y + h[2]) / d, y: (h[3] * x + h[4] * y + h[5]) / d };
}
export function inverse(h: Homography): Homography {
  const [a, b, c, d, e, f, g, k, i] = h;
  const matrix = [e * i - f * k, c * k - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * k - e * g, b * g - a * k, a * e - b * d];
  const determinant = a * matrix[0]! + b * matrix[3]! + c * matrix[6]!;
  if (Math.abs(determinant) < 1e-12) throw new Error('Perspective is singular. Correct the opening corners.');
  return matrix.map((v) => v / determinant) as Homography;
}
