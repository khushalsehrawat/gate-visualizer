export interface Point { x: number; y: number }
export type Quad = [Point, Point, Point, Point]; // TL, TR, BR, BL, image coordinates
export interface Candidate { corners: Quad; score: number; source: 'contour' | 'lines' }
export const cornerLabels = ['Top left', 'Top right', 'Bottom right', 'Bottom left'] as const;
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function polygonArea(points: readonly Point[]) {
  return points.reduce((sum, p, i) => { const next = points[(i + 1) % points.length]!; return sum + p.x * next.y - next.x * p.y; }, 0) / 2;
}
export function orderCorners(points: readonly Point[]): Quad | null {
  if (points.length !== 4 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const center = { x: points.reduce((n, p) => n + p.x, 0) / 4, y: points.reduce((n, p) => n + p.y, 0) / 4 };
  const sorted = [...points].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
  if (polygonArea(sorted) < 0) sorted.reverse();
  const start = sorted.reduce((best, p, i) => p.x + p.y < sorted[best]!.x + sorted[best]!.y ? i : best, 0);
  return [...sorted.slice(start), ...sorted.slice(0, start)] as Quad;
}
export function validateQuad(points: readonly Point[], width = 1, height = 1, region = false): string | null {
  if (points.length !== 4) return 'Select all four corners in TL, TR, BR, BL order.';
  if (![width, height].every((v) => Number.isFinite(v) && v > 0) || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x > width || p.y > height)) return 'Corners must be finite and inside the photo.';
  const area = polygonArea(points) / (width * height);
  if (area < (region ? 0.005 : 0.03) || area > (region ? 1 : 0.92)) return region ? 'Select a visible region covering at least 0.5% of the frame.' : 'Opening must cover 3–92% of the photo; avoid tiny regions and the outer photo border.';
  for (let i = 0; i < 4; i++) {
    const a = points[i]!, b = points[(i + 1) % 4]!, c = points[(i + 2) % 4]!;
    if (distance(a, b) < Math.min(width, height) * (region ? 0.01 : 0.06) || cross(a, b, c) / (distance(a, b) * distance(b, c)) < (region ? 0.02 : 0.15)) return 'Corners overlap, cross, or form a near-degenerate opening.';
  }
  const [tl, tr, br, bl] = points as Quad;
  if (tl.x >= tr.x || bl.x >= br.x || tl.y >= bl.y || tr.y >= br.y) return 'Keep labels at top-left, top-right, bottom-right and bottom-left. Retake a more frontal photo.';
  const aspect = (distance(tl, tr) + distance(bl, br)) / (distance(tl, bl) + distance(tr, br));
  if (aspect < (region ? 0.02 : 0.35) || aspect > (region ? 50 : 6)) return 'Opening proportions are outside this heuristic’s supported range.';
  return null;
}
export interface Segment { a: Point; b: Point }
export function lineIntersection(first: Segment, second: Segment): Point | null {
  const { a, b } = first, { a: c, b: d } = second;
  const denominator = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(denominator) < 1e-6) return null;
  const ab = a.x * b.y - a.y * b.x, cd = c.x * d.y - c.y * d.x;
  return { x: (ab * (c.x - d.x) - (a.x - b.x) * cd) / denominator, y: (ab * (c.y - d.y) - (a.y - b.y) * cd) / denominator };
}

export function heuristicScore(quad: Quad, edgeSupport: number, width: number, height: number) {
  const area = Math.min(1, polygonArea(quad) / (width * height) / 0.35);
  const angles = quad.map((a, i) => {
    const b = quad[(i + 1) % 4]!, c = quad[(i + 2) % 4]!;
    const cosine = ((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)) / (distance(a, b) * distance(c, b));
    return 1 - Math.abs(cosine);
  }).reduce((a, b) => a + b, 0) / 4;
  return Math.round(Math.max(0, Math.min(95, 100 * (0.55 * edgeSupport + 0.2 * area + 0.25 * angles))));
}
