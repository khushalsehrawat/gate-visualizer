import { Matrix4, Vector3 } from 'three';

export interface GateCalibration {
  width: number; height: number; scale: number;
  x: number; z: number; elevation: number; yaw: number;
}
export const defaultCalibration: GateCalibration = { width: 3, height: 1.8, scale: 1, x: 0, z: 0, elevation: 0, yaw: 0 };

export function fitGateImage(width: number, height: number, pixelWidth: number, pixelHeight: number) {
  if (![width, height, pixelWidth, pixelHeight].every((n) => Number.isFinite(n) && n > 0)) throw new RangeError('Dimensions must be finite and positive.');
  const aspect = pixelWidth / pixelHeight;
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('Invalid image aspect ratio.');
  const fittedWidth = Math.min(width, height * aspect);
  const fittedHeight = fittedWidth / aspect;
  if (!Number.isFinite(fittedWidth) || !Number.isFinite(fittedHeight) || fittedWidth <= 0 || fittedHeight <= 0) throw new RangeError('Image dimensions cannot form a valid plane.');
  return { width: fittedWidth, height: fittedHeight };
}

export function validCalibration(value: GateCalibration) {
  return Object.values(value).every(Number.isFinite) && value.width >= 0.2 && value.width <= 20 && value.height >= 0.2 && value.height <= 10 && value.scale >= 0.1 && value.scale <= 3 && Math.abs(value.x) <= 20 && Math.abs(value.z) <= 20 && Math.abs(value.elevation) <= 10 && Math.abs(value.yaw) <= 360;
}

// Two spatial XR hits supply depth and baseline direction. Image-space points do not.
export function entranceBasis(left: Vector3, right: Vector3) {
  const baseline = right.clone().sub(left); baseline.y = 0;
  const distance = baseline.length();
  if (!Number.isFinite(distance) || distance < 0.2 || distance > 20) throw new RangeError('Pillar points must be 0.2–20 m apart horizontally.');
  const origin = left.clone().add(right).multiplyScalar(0.5);
  origin.y = left.y;
  const yaw = Math.atan2(-baseline.z, baseline.x);
  return { matrix: new Matrix4().makeTranslation(origin.x, origin.y, origin.z).multiply(new Matrix4().makeRotationY(yaw)), distance, heightDifference: Math.abs(left.y - right.y) };
}

export function adjustedGateMatrix(base: Matrix4, relativeBasis: Matrix4, value: GateCalibration) {
  const anchored = base.clone().multiply(relativeBasis);
  const origin = new Vector3().setFromMatrixPosition(anchored);
  const horizontal = new Vector3(1, 0, 0).transformDirection(anchored);
  const yaw = Math.atan2(-horizontal.z, horizontal.x) + value.yaw * Math.PI / 180;
  // Anchor corrections can adjust pose; gravity-aligned world +Y stays vertical.
  return new Matrix4().makeTranslation(origin.x + value.x, origin.y + value.elevation, origin.z + value.z)
    .multiply(new Matrix4().makeRotationY(yaw));
}
