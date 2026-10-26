import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { adjustedGateMatrix, defaultCalibration, entranceBasis, fitGateImage, validCalibration } from './calibration';
import { createGatePlane } from './gatePlane';

describe('metric gate geometry and aspect ratio', () => {
  it('creates a vertical XY plane with bottom-center origin and upright standard UVs', () => {
    const geometry = createGatePlane(3, 2);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.toArray()).toEqual([-1.5, 0, 0]);
    expect(geometry.boundingBox?.max.toArray()).toEqual([1.5, 2, 0]);
    const position = geometry.getAttribute('position'); const uv = geometry.getAttribute('uv');
    expect(position.getY(0)).toBe(2); expect(uv.getY(0)).toBe(1);
    expect(position.getY(2)).toBe(0); expect(uv.getY(2)).toBe(0);
    expect(geometry.getAttribute('normal').getZ(0)).toBe(1);
    geometry.dispose();
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid plane dimensions: %s', (size) => {
    expect(() => createGatePlane(size, 2)).toThrow(RangeError);
    expect(() => fitGateImage(3, 2, size, 360)).toThrow(RangeError);
  });
  it.each([[1600, 900], [900, 1600], [1000, 1000]])('contains %s × %s without stretching or cropping', (width, height) => {
    const fitted = fitGateImage(3, 2, width, height);
    expect(fitted.width / fitted.height).toBeCloseTo(width / height);
    expect(fitted.width).toBeLessThanOrEqual(3);
    expect(fitted.height).toBeLessThanOrEqual(2);
    expect(Math.max(fitted.width / 3, fitted.height / 2)).toBeCloseTo(1);
  });
  it('derives position and yaw from two spatial pillar bases while keeping +Y vertical', () => {
    const left = new Vector3(1, 0, 2), right = new Vector3(4, 0, -1);
    const basis = entranceBasis(left, right);
    expect(basis.distance).toBeCloseTo(Math.sqrt(18));
    expect(new Vector3().setFromMatrixPosition(basis.matrix).toArray()).toEqual([2.5, 0, 0.5]);
    const direction = new Vector3(1, 0, 0).transformDirection(basis.matrix);
    expect(direction.distanceTo(right.clone().sub(left).normalize())).toBeLessThan(1e-6);
    expect(new Vector3(0, 1, 0).transformDirection(basis.matrix).toArray()).toEqual([0, 1, 0]);
  });
  it('rejects duplicate or implausibly distant pillar bases', () => {
    expect(() => entranceBasis(new Vector3(), new Vector3(0, 1, 0))).toThrow(RangeError);
    expect(() => entranceBasis(new Vector3(), new Vector3(21, 0, 0))).toThrow(RangeError);
  });
  it('compensates a tilted hit anchor and applies translations in world axes', () => {
    const raw = new Matrix4().makeTranslation(3, 0, -2).multiply(new Matrix4().makeRotationX(-Math.PI / 2));
    const upright = entranceBasis(new Vector3(0, 0, -2), new Vector3(3, 0, -2)).matrix;
    const relative = raw.clone().invert().multiply(upright);
    const adjusted = adjustedGateMatrix(raw, relative, { ...defaultCalibration, x: 1, z: -0.5, elevation: 0.2, yaw: 90 });
    expect(new Vector3().setFromMatrixPosition(adjusted).distanceTo(new Vector3(2.5, 0.2, -2.5))).toBeLessThan(1e-6);
    expect(new Vector3(0, 1, 0).transformDirection(adjusted).toArray()).toEqual([0, 1, 0]);
    expect(new Vector3(1, 0, 0).transformDirection(adjusted).z).toBeCloseTo(-1);
  });
  it('validates all editable dimensions, offsets and scale limits', () => {
    expect(validCalibration(defaultCalibration)).toBe(true);
    expect(validCalibration({ ...defaultCalibration, scale: 0 })).toBe(false);
    expect(validCalibration({ ...defaultCalibration, width: NaN })).toBe(false);
    expect(validCalibration({ ...defaultCalibration, elevation: 11 })).toBe(false);
  });
});
