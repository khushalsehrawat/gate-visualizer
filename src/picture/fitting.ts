import { gateLayout } from '../geometry/fitting';
import { distance } from '../detection/geometry';
import type { Quad } from '../detection/geometry';
export interface PictureFit { mode: 'fill' | 'fit' | 'crop'; aspect: number; width: number; height: number; x: number; y: number }
export const defaultPictureFit: PictureFit = { mode: 'fit', aspect: 3 / 1.8, width: 1, height: 1, x: 0, y: 0 };
// Apparent image-plane proportions only; not a metric size or recovered world plane.
export function regionAspect(corners: Quad, width: number, height: number) {
  const [tl, tr, br, bl] = corners.map((p) => ({ x: p.x * width, y: p.y * height })) as Quad;
  const aspect = (distance(tl, tr) + distance(bl, br)) / (distance(tl, bl) + distance(tr, br));
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error('Select four distinct area corners.');
  return Math.min(20, Math.max(.05, aspect));
}
export function pictureLayout(value: PictureFit, pixelWidth: number, pixelHeight: number) {
  if (![value.aspect, value.width, value.height, pixelWidth, pixelHeight].every((n) => Number.isFinite(n) && n > 0) || ![value.x, value.y].every(Number.isFinite) || !['fill', 'fit', 'crop'].includes(value.mode)) throw new Error('Invalid picture fitting settings.');
  const layout = gateLayout(value.aspect, 1, pixelWidth, pixelHeight, value.mode === 'fit' ? 'fit' : 'crop');
  const w = (value.mode === 'fit' ? layout.width / value.aspect : 1) * value.width;
  const h = (value.mode === 'fit' ? layout.height : 1) * value.height;
  return { left: (1 - w) / 2 + value.x, top: 1 - h + value.y, width: w, height: h,
    repeatX: value.mode === 'crop' ? layout.repeatX : 1, repeatY: value.mode === 'crop' ? layout.repeatY : 1,
    offsetX: value.mode === 'crop' ? layout.offsetX : 0, offsetY: value.mode === 'crop' ? 1 - layout.offsetY - layout.repeatY : 0 };
}
