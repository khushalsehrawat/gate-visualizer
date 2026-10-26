import type * as CV from '@techstark/opencv-js';
import { distance, heuristicScore, lineIntersection, orderCorners, validateQuad } from './geometry';
import type { Candidate, Quad, Segment } from './geometry';
import type { DetectionInput, DetectionResult } from './types';
export type OpenCV = typeof CV;

function edgeSupport(quad: Quad, data: Uint8Array, width: number, height: number) {
  let supported = 0, count = 0;
  for (let side = 0; side < 4; side++) {
    const a = quad[side]!, b = quad[(side + 1) % 4]!;
    const steps = Math.min(120, Math.ceil(distance(a, b)));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(a.x + (b.x - a.x) * i / steps), y = Math.round(a.y + (b.y - a.y) * i / steps);
      let found = false;
      for (let dy = -3; dy <= 3 && !found; dy++) for (let dx = -3; dx <= 3; dx++) {
        if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height && data[(y + dy) * width + x + dx]) { found = true; break; }
      }
      supported += Number(found); count++;
    }
  }
  return supported / count;
}

export function detectOpening(cv: OpenCV, input: DetectionInput): DetectionResult {
  const { width, height, pixels } = input;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 32 || height < 32 || width > 960 || height > 960 || pixels.length !== width * height * 4) throw new Error('Invalid detector image; use 32–960 px RGBA data.');
  const resources: { delete(): void }[] = [];
  const own = <T extends { delete(): void }>(value: T) => { resources.push(value); return value; };
  try {
    const src = own(cv.matFromArray(height, width, cv.CV_8UC4, pixels));
    const gray = own(new cv.Mat()), enhanced = own(new cv.Mat()), blurred = own(new cv.Mat()), edges = own(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    let sum = 0, square = 0;
    for (const value of gray.data) { sum += value; square += value * value; }
    const mean = sum / gray.data.length, deviation = Math.sqrt(Math.max(0, square / gray.data.length - mean * mean));
    const empty = (quality: DetectionResult['quality'], message: string, edgeDensity = 0): DetectionResult => ({ candidates: [], quality, message, meanBrightness: mean, edgeDensity });
    if (mean < 35) return empty('low-light', 'Photo is too dark for reliable edge proposals. Retake in better light, or mark corners manually.');
    if (deviation < 12) return empty('low-contrast', 'Not enough contrast to propose an opening. Retake or mark the four actual boundaries manually.');
    cv.equalizeHist(gray, enhanced);
    cv.GaussianBlur(enhanced, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 55, 140);
    const edgeDensity = cv.countNonZero(edges) / (width * height);
    if (edgeDensity > 0.23) return empty('clutter', 'Dense edges/clutter make these proposals unreliable. Move closer, simplify the view, or mark manually.', edgeDensity);
    const raw: { quad: Quad; source: Candidate['source'] }[] = [];
    const contours = own(new cv.MatVector()), hierarchy = own(new cv.Mat());
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < Math.min(contours.size(), 160); i++) {
      const contour = contours.get(i), approx = new cv.Mat();
      try {
        cv.approxPolyDP(contour, approx, 0.025 * cv.arcLength(contour, true), true);
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const points = Array.from({ length: 4 }, (_, j) => ({ x: approx.data32S[j * 2]!, y: approx.data32S[j * 2 + 1]! }));
          const quad = orderCorners(points); if (quad && !validateQuad(quad, width, height)) raw.push({ quad, source: 'contour' });
        }
      } finally { contour.delete(); approx.delete(); }
    }
    const lines = own(new cv.Mat());
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 35, Math.min(width, height) * 0.16, 18);
    const segments: Segment[] = [];
    for (let i = 0; i < lines.rows; i++) segments.push({ a: { x: lines.data32S[i * 4]!, y: lines.data32S[i * 4 + 1]! }, b: { x: lines.data32S[i * 4 + 2]!, y: lines.data32S[i * 4 + 3]! } });
    segments.sort((a, b) => distance(b.a, b.b) - distance(a.a, a.b));
    const vertical = segments.filter(({ a, b }) => Math.abs(b.y - a.y) > Math.abs(b.x - a.x) * 1.4).slice(0, 8);
    const horizontal = segments.filter(({ a, b }) => Math.abs(b.x - a.x) > Math.abs(b.y - a.y) * 1.4).slice(0, 8);
    for (let l = 0; l < vertical.length; l++) for (let r = l + 1; r < vertical.length; r++) {
      for (let t = 0; t < horizontal.length; t++) for (let b = t + 1; b < horizontal.length; b++) {
        const intersections = [lineIntersection(vertical[l]!, horizontal[t]!), lineIntersection(vertical[r]!, horizontal[t]!), lineIntersection(vertical[r]!, horizontal[b]!), lineIntersection(vertical[l]!, horizontal[b]!)];
        if (intersections.some((p) => !p)) continue;
        const quad = orderCorners(intersections as Quad);
        if (quad && !validateQuad(quad, width, height)) raw.push({ quad, source: 'lines' });
      }
    }
    const candidates: Candidate[] = [];
    for (const { quad, source } of raw.slice(0, 1000)) {
      const support = edgeSupport(quad, edges.data, width, height);
      if (support < 0.55) continue;
      const normalized = quad.map((p) => ({ x: p.x / width, y: p.y / height })) as Quad;
      if (candidates.some((candidate) => candidate.corners.reduce((n, p, i) => n + distance(p, normalized[i]!), 0) < 0.12)) continue;
      candidates.push({ corners: normalized, source, score: heuristicScore(quad, support, width, height) });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return empty('no-opening', 'No supported quadrilateral found. This does not prove there is no gate opening. Retake a frontal photo or mark corners manually.', edgeDensity);
    return { candidates: candidates.slice(0, 5), quality: 'ok', message: 'Geometric proposals only: windows, walls and clutter can look similar. Inspect each boundary before confirming.', meanBrightness: mean, edgeDensity };
  } finally { for (const resource of resources.reverse()) resource.delete(); }
}
