import { describe, expect, it } from 'vitest';
import { homography, inverse, project } from './projective';
import { compositePhoto } from './composite';
import { defaultPhotoSettings } from './model';
import type { Quad } from '../detection/geometry';
function raster(width: number, height: number, rgba: number[]) { const pixels = new Uint8ClampedArray(width * height * 4); for (let i = 0; i < pixels.length; i += 4) pixels.set(rgba, i); return { width, height, pixels }; }
const corners: Quad = [{ x: .1, y: .1 }, { x: .9, y: .2 }, { x: .8, y: .9 }, { x: .2, y: .8 }];
describe('true perspective photo composition', () => {
  it('maps all four corners exactly and inverse-maps interior points', () => {
    const h = homography(corners), inv = inverse(h);
    [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([x, y], i) => { const p = project(h, x!, y!); expect(p.x).toBeCloseTo(corners[i]!.x); expect(p.y).toBeCloseTo(corners[i]!.y); });
    const warped = project(h, .34, .67), restored = project(inv, warped.x, warped.y);
    expect(restored.x).toBeCloseTo(.34); expect(restored.y).toBeCloseTo(.67);
  });
  it('composites actual source alpha into the house and leaves exterior pixels unchanged', () => {
    const photo = raster(100, 100, [20, 40, 60, 255]), gate = raster(4, 4, [220, 100, 60, 128]);
    const pixels = compositePhoto({ photo, gate, corners, settings: { ...defaultPhotoSettings, opacity: .5 } });
    expect(Array.from(pixels.slice(0, 4))).toEqual([20, 40, 60, 255]);
    const center = (50 * 100 + 50) * 4;
    expect(pixels[center]).toBeCloseTo(70, 0); expect(pixels[center + 3]).toBe(255);
    expect(photo.pixels[center]).toBe(20);
  });
  it('supports crop, fit, proportional, brightness and zero-opacity without defaults replacing failures', () => {
    const photo = raster(100, 100, [30, 30, 30, 255]), gate = raster(20, 10, [100, 100, 100, 255]);
    const invisible = compositePhoto({ photo, gate, corners, settings: { ...defaultPhotoSettings, opacity: 0 } });
    expect(invisible).toEqual(photo.pixels);
    for (const fitting of ['fit', 'crop', 'proportional'] as const) {
      const pixels = compositePhoto({ photo, gate, corners, settings: { ...defaultPhotoSettings, fitting, brightness: 1.5 } });
      expect(pixels.some((value, i) => i % 4 !== 3 && value > 100)).toBe(true);
    }
    expect(() => compositePhoto({ photo, gate, corners: [corners[0], corners[0], corners[2], corners[3]], settings: defaultPhotoSettings })).toThrow();
    expect(() => homography([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }])).toThrow();
  });
});
