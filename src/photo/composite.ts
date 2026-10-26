import { gateLayout } from '../geometry/fitting';
import { validateQuad } from '../detection/geometry';
import type { Quad } from '../detection/geometry';
import { adjustedChannel, defaultPresentation } from '../gates/presentation';
import { homography, inverse, project } from './projective';
import type { CompositeRequest } from './model';
import { validPhotoSettings } from './model';

export function compositePhoto(input: CompositeRequest): Uint8ClampedArray {
  const { photo, gate, corners, settings } = input;
  for (const raster of [photo, gate]) if (!Number.isInteger(raster.width) || !Number.isInteger(raster.height) || raster.width < 1 || raster.height < 1 || raster.width > 4096 || raster.height > 4096 || raster.pixels.length !== raster.width * raster.height * 4) throw new Error('Invalid image pixels.');
  const validation = validateQuad(corners.map((p) => ({ x: p.x * photo.width, y: p.y * photo.height })), photo.width, photo.height);
  if (validation || !validPhotoSettings(settings)) throw new Error(validation ?? 'Invalid photo settings.');
  const q = corners.map((p) => ({ x: p.x * photo.width, y: p.y * photo.height })) as Quad;
  const h = homography(q), inv = inverse(h);
  const layout = gateLayout(settings.width, settings.height, gate.width, gate.height, settings.fitting, settings.scale);
  const w = layout.width / settings.width, height = layout.height / settings.height;
  const left = 0.5 - w / 2 + settings.x, top = 1 - height + settings.y;
  const limits = [{ x: left, y: top }, { x: left + w, y: top }, { x: left + w, y: top + height }, { x: left, y: top + height }];
  const denominators = limits.map((p) => h[6] * p.x + h[7] * p.y + h[8]);
  if (denominators.some((d) => Math.abs(d) < 1e-6 || Math.sign(d) !== Math.sign(denominators[0]!))) throw new Error('Size crosses the perspective horizon. Reduce scale/offset.');
  const projected = limits.map((p) => project(h, p.x, p.y));
  const minX = Math.max(0, Math.floor(Math.min(...projected.map((p) => p.x)))), maxX = Math.min(photo.width - 1, Math.ceil(Math.max(...projected.map((p) => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...projected.map((p) => p.y)))), maxY = Math.min(photo.height - 1, Math.ceil(Math.max(...projected.map((p) => p.y))));
  const output = photo.pixels.slice();
  const lut = Array.from({ length: 256 }, (_, c) => adjustedChannel(c / 255, { ...defaultPresentation, brightness: settings.brightness }) * 255);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const divisor = inv[6] * (x + 0.5) + inv[7] * (y + 0.5) + inv[8];
    if (Math.abs(divisor) < 1e-8) continue;
    const u = ((inv[0] * (x + 0.5) + inv[1] * (y + 0.5) + inv[2]) / divisor - left) / w;
    const v = ((inv[3] * (x + 0.5) + inv[4] * (y + 0.5) + inv[5]) / divisor - top) / height;
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    const sx = Math.max(0, Math.min(gate.width - 1, (layout.offsetX + u * layout.repeatX) * gate.width - 0.5));
    const sy = Math.max(0, Math.min(gate.height - 1, (1 - layout.offsetY - layout.repeatY + v * layout.repeatY) * gate.height - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    let a = 0, r = 0, g = 0, b = 0;
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
      const weight = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
      const index = (Math.min(gate.height - 1, y0 + dy) * gate.width + Math.min(gate.width - 1, x0 + dx)) * 4;
      const alpha = gate.pixels[index + 3]! / 255 * settings.opacity * weight;
      a += alpha; r += lut[gate.pixels[index]!]! * alpha; g += lut[gate.pixels[index + 1]!]! * alpha; b += lut[gate.pixels[index + 2]!]! * alpha;
    }
    const at = (y * photo.width + x) * 4, da = photo.pixels[at + 3]! / 255;
    const outAlpha = a + da * (1 - a);
    if (outAlpha > 0) {
      output[at] = (r + photo.pixels[at]! * da * (1 - a)) / outAlpha;
      output[at + 1] = (g + photo.pixels[at + 1]! * da * (1 - a)) / outAlpha;
      output[at + 2] = (b + photo.pixels[at + 2]! * da * (1 - a)) / outAlpha;
      output[at + 3] = outAlpha * 255;
    }
  }
  return output;
}
