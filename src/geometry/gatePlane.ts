import { PlaneGeometry } from 'three';

// Local XY plane, upright along +Y, bottom-center origin. Standard UVs keep image top up.
export function createGatePlane(widthMeters: number, heightMeters: number): PlaneGeometry {
  if (!Number.isFinite(widthMeters) || !Number.isFinite(heightMeters) || widthMeters <= 0 || heightMeters <= 0) {
    throw new RangeError('Gate dimensions must be finite positive meters.');
  }
  return new PlaneGeometry(widthMeters, heightMeters).translate(0, heightMeters / 2, 0);
}
