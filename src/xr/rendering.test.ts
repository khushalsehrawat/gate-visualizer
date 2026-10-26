import { Matrix4, Mesh, SRGBColorSpace } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { defaultCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';
import { createTestScene } from './rendering';
import { defaultPresentation } from '../gates/presentation';

export function imageFixture(width = 640, height = 360): GateImage {
  return { image: document.createElement('img'), asset: { id: 'test', name: 'Test gate', src: '/gate.png', widthPixels: width, heightPixels: height, placeholder: false } };
}

describe('gate world scene', () => {
  it('uses an upright, alpha-aware sRGB texture and preserves the image aspect', () => {
    const world = createTestScene();
    world.setGateImage(imageFixture()); world.configureGate(defaultCalibration, true);
    const cube = world.marker.children[0] as Mesh;
    const gate = world.marker.children[1] as Mesh;
    const material = Array.isArray(gate.material) ? gate.material[0]! : gate.material;
    expect(cube.visible).toBe(false); expect(gate.visible).toBe(true);
    expect(material).toMatchObject({ transparent: true, depthWrite: false, alphaTest: 0.01, map: { flipY: true, colorSpace: SRGBColorSpace } });
    expect(gate.scale.x / gate.scale.y).toBeCloseTo(640 / 360);
    expect(world.marker.parent).toBe(world.scene);
    world.dispose();
  });
  it('replaces/disposes textures without changing world placement and disposes final resources', () => {
    const world = createTestScene(); world.setGateImage(imageFixture());
    world.marker.matrix.makeTranslation(1, 2, -3);
    const original = world.marker.matrix.clone();
    const gate = world.marker.children[1] as Mesh;
    const material = Array.isArray(gate.material) ? gate.material[0]! : gate.material;
    const oldTexture = (material as import('three').MeshBasicMaterial).map!;
    const oldDispose = vi.spyOn(oldTexture, 'dispose');
    world.setGateImage(imageFixture(500, 1000)); world.configureGate(defaultCalibration, true);
    expect(oldDispose).toHaveBeenCalledTimes(1);
    expect(world.marker.matrix.equals(original)).toBe(true);
    expect(gate.scale.x / gate.scale.y).toBeCloseTo(0.5);
    const nextDispose = vi.spyOn((material as import('three').MeshBasicMaterial).map!, 'dispose');
    const geometryDispose = vi.spyOn(gate.geometry, 'dispose');
    world.dispose();
    expect(nextDispose).toHaveBeenCalledTimes(1); expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(world.scene.children).toHaveLength(0);
  });
  it('keeps the Stage 2 cube available in diagnostic mode', () => {
    const world = createTestScene(); world.setGateImage(imageFixture());
    world.configureGate(defaultCalibration, false);
    expect(world.marker.children[0]?.visible).toBe(true);
    expect(world.marker.children[1]?.visible).toBe(false);
    expect(world.marker.matrix.equals(new Matrix4())).toBe(true);
    world.dispose();
  });
  it('crops via UVs at the calibrated plane size and switches before/after without moving it', () => {
    const world = createTestScene(); world.setGateImage(imageFixture(1600, 800));
    world.configureGate({ ...defaultCalibration, width: 3, height: 2 }, true);
    world.marker.matrix.makeTranslation(1, 0, -3);
    const matrix = world.marker.matrix.clone(); const gate = world.marker.children[1] as Mesh;
    world.setPresentation({ ...defaultPresentation, fitting: 'crop', opacity: 0.5 });
    expect(gate.scale.toArray()).toEqual([3, 2, 1]);
    const material = gate.material as import('three').MeshBasicMaterial;
    expect(material.map!.repeat.x).toBeCloseTo(0.75); expect(material.map!.offset.x).toBeCloseTo(0.125);
    expect(material.opacity).toBe(0.5);
    world.setPresentation({ ...defaultPresentation, fitting: 'crop', before: true });
    expect(gate.visible).toBe(false); expect(world.marker.matrix.equals(matrix)).toBe(true);
    world.setGateImage(imageFixture(800, 1600));
    expect(gate.visible).toBe(false); expect(gate.scale.toArray()).toEqual([3, 2, 1]);
    world.setPresentation({ ...defaultPresentation, fitting: 'crop', before: false });
    expect(gate.visible).toBe(true); expect(world.marker.matrix.equals(matrix)).toBe(true);
    world.dispose();
  });
  it('updates shader uniforms without geometry allocation or texture replacement', () => {
    const world = createTestScene(); world.setGateImage(imageFixture()); world.configureGate(defaultCalibration, true);
    const gate = world.marker.children[1] as Mesh;
    const material = gate.material as import('three').MeshBasicMaterial;
    const texture = material.map, geometry = gate.geometry;
    const shader = { uniforms: {} as Record<string, { value: number }>, fragmentShader: '#include <map_fragment>' };
    material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0], {} as import('three').WebGLRenderer);
    world.setPresentation({ ...defaultPresentation, brightness: 1.2, contrast: 1.1, exposure: -0.5 });
    expect(shader.uniforms.gateBrightness!.value).toBe(1.2); expect(shader.uniforms.gateExposure!.value).toBe(-0.5);
    expect(shader.fragmentShader).toContain('exp2(gateExposure)');
    expect(material.map).toBe(texture); expect(gate.geometry).toBe(geometry);
    world.dispose();
  });
});
