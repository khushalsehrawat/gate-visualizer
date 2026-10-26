import type { Candidate, Quad } from './geometry';
export interface DetectionInput { width: number; height: number; pixels: Uint8ClampedArray }
export interface DetectionResult {
  candidates: Candidate[]; // normalized corners in TL, TR, BR, BL order
  quality: 'ok' | 'low-light' | 'low-contrast' | 'clutter' | 'no-opening';
  message: string;
  meanBrightness: number;
  edgeDensity: number;
}
export type WorkerReply = { ok: true; result: DetectionResult } | { ok: false; message: string };
export interface ConfirmedOpening { corners: Quad; source: 'proposal' | 'manual'; width: number; height: number }
