import type { FittingMode } from '../geometry/fitting';
import type { Quad } from '../detection/geometry';
export interface PhotoSettings { fitting: FittingMode; width: number; height: number; scale: number; x: number; y: number; opacity: number; brightness: number }
export const defaultPhotoSettings: PhotoSettings = { fitting: 'crop', width: 3, height: 1.8, scale: 1, x: 0, y: 0, opacity: 1, brightness: 1 };
export function validPhotoSettings(value: PhotoSettings) {
  return ['fit', 'crop', 'proportional'].includes(value.fitting) && [value.width, value.height, value.scale, value.x, value.y, value.opacity, value.brightness].every(Number.isFinite)
    && value.width >= 0.2 && value.width <= 20 && value.height >= 0.2 && value.height <= 10 && value.scale >= 0.25 && value.scale <= 1.5
    && Math.abs(value.x) <= 0.5 && Math.abs(value.y) <= 0.5 && value.opacity >= 0 && value.opacity <= 1 && value.brightness >= 0.25 && value.brightness <= 2;
}
export interface Raster { width: number; height: number; pixels: Uint8ClampedArray }
export interface CompositeRequest { photo: Raster; gate: Raster; corners: Quad; settings: PhotoSettings }
export interface SavedProject {
  version: 1; id: string; name: string; createdAt: number; updatedAt: number;
  photo: Blob; gate: Blob; composite: Blob; gateName: string; photoWidth: number; photoHeight: number;
  corners: Quad; settings: PhotoSettings;
}
