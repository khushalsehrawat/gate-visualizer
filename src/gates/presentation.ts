import type { FittingMode } from '../geometry/fitting';
export interface GatePresentation {
  fitting: FittingMode; brightness: number; contrast: number; opacity: number;
  exposure: number; before: boolean; smoothing: boolean;
}
export const defaultPresentation: GatePresentation = { fitting: 'fit', brightness: 1, contrast: 1, opacity: 1, exposure: 0, before: false, smoothing: true };
export function validPresentation(value: GatePresentation) {
  return ['fit', 'crop', 'proportional'].includes(value.fitting) && [value.brightness, value.contrast, value.opacity, value.exposure].every(Number.isFinite)
    && value.brightness >= 0.25 && value.brightness <= 2 && value.contrast >= 0.25 && value.contrast <= 2.5
    && value.opacity >= 0 && value.opacity <= 1 && value.exposure >= -2 && value.exposure <= 2 && typeof value.before === 'boolean' && typeof value.smoothing === 'boolean';
}
export function adjustedChannel(srgb: number, settings: GatePresentation) {
  const linear = srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  const adjusted = Math.max(0, ((linear - 0.18) * settings.contrast + 0.18) * settings.brightness * 2 ** settings.exposure);
  return Math.min(1, adjusted <= 0.0031308 ? adjusted * 12.92 : 1.055 * adjusted ** (1 / 2.4) - 0.055);
}
