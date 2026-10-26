// @vitest-environment node
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import { detectOpening } from './engine';
import type { OpenCV } from './engine';
import type { DetectionInput } from './types';
import { validateQuad } from './geometry';

let cv: OpenCV;
beforeAll(async () => {
  // The UMD package exports a Promise. Load it without ESM namespace assimilation.
  cv = await (createRequire(import.meta.url)('@techstark/opencv-js') as Promise<OpenCV>);
}, 30000);
function photo(value: number): DetectionInput {
  const width = 320, height = 240, pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) { pixels[i] = value; pixels[i + 1] = value; pixels[i + 2] = value; pixels[i + 3] = 255; }
  return { width, height, pixels };
}
describe('actual OpenCV.js WASM detector on synthetic pixels', () => {
  it('returns actual edge-supported proposals, not semantic gate recognition', () => {
    const input = photo(200);
    for (let y = 40; y <= 200; y++) for (let x = 45; x <= 275; x++) {
      if (x < 52 || x > 268 || y < 47 || y > 193) {
        const index = (y * input.width + x) * 4; input.pixels[index] = 15; input.pixels[index + 1] = 15; input.pixels[index + 2] = 15;
      }
    }
    const result = detectOpening(cv, input);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.message).toMatch(/Geometric proposals only/);
    for (const candidate of result.candidates) {
      expect(validateQuad(candidate.corners)).toBeNull();
      expect(candidate.score).toBeLessThanOrEqual(95);
    }
  });
  it('returns no rectangle for darkness or a blank/no-opening image', () => {
    const dark = detectOpening(cv, photo(5));
    expect(dark.quality).toBe('low-light'); expect(dark.candidates).toEqual([]);
    const blank = detectOpening(cv, photo(150));
    expect(blank.quality).toBe('low-contrast'); expect(blank.candidates).toEqual([]);
  });
  it('reports no-opening when contrast exists but no quadrilateral is supported', () => {
    const input = photo(180);
    for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width / 2; x++) {
      const index = (y * input.width + x) * 4;
      input.pixels[index] = 50; input.pixels[index + 1] = 50; input.pixels[index + 2] = 50;
    }
    const result = detectOpening(cv, input);
    expect(result.quality).toBe('no-opening'); expect(result.candidates).toEqual([]);
  });
  it('rejects malformed buffers and oversized work before calling OpenCV', () => {
    expect(() => detectOpening(cv, { width: 32, height: 32, pixels: new Uint8ClampedArray(4) })).toThrow(/Invalid detector image/);
    expect(() => detectOpening(cv, { width: 2000, height: 10, pixels: new Uint8ClampedArray(0) })).toThrow(/Invalid detector image/);
  });
});
