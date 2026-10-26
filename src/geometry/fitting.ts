import { fitGateImage } from './calibration';
export type FittingMode = 'fit' | 'crop' | 'proportional';
export interface GateLayout { width: number; height: number; repeatX: number; repeatY: number; offsetX: number; offsetY: number }
export function gateLayout(width: number, height: number, pixelWidth: number, pixelHeight: number, mode: FittingMode, scale = 1): GateLayout {
  const fitted = fitGateImage(width, height, pixelWidth, pixelHeight);
  if (!Number.isFinite(scale) || scale <= 0 || !['fit', 'crop', 'proportional'].includes(mode)) throw new RangeError('Invalid fitting mode or scale.');
  const imageAspect = pixelWidth / pixelHeight, openingAspect = width / height;
  let w = fitted.width, h = fitted.height, repeatX = 1, repeatY = 1;
  if (mode === 'proportional') { w = width; h = width / imageAspect; }
  if (mode === 'crop') {
    w = width; h = height;
    if (imageAspect > openingAspect) repeatX = openingAspect / imageAspect;
    else repeatY = imageAspect / openingAspect;
  }
  if (![w * scale, h * scale].every((n) => Number.isFinite(n) && n > 0)) throw new RangeError('Fitted plane dimensions overflow.');
  return { width: w * scale, height: h * scale, repeatX, repeatY, offsetX: (1 - repeatX) / 2, offsetY: 0 };
}
