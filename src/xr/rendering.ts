import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, RingGeometry, Scene, SRGBColorSpace, Texture, WebGLRenderer } from 'three';
import { createGatePlane } from '../geometry/gatePlane';
import { gateLayout } from '../geometry/fitting';
import { defaultPresentation } from '../gates/presentation';
import type { GatePresentation } from '../gates/presentation';
import type { GateCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';

export type XRRenderer = Pick<WebGLRenderer, 'domElement' | 'xr' | 'setAnimationLoop' | 'render' | 'dispose' | 'forceContextLoss' | 'setSize' | 'setPixelRatio' | 'setClearColor'> & Partial<Pick<WebGLRenderer, 'info'>>;

export function createXRRenderer(): XRRenderer {
  return new WebGLRenderer({ alpha: true, antialias: true });
}

export function createTestScene() {
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const marker = new Group();
  marker.matrixAutoUpdate = false;
  marker.visible = false;
  const cubeGeometry = new BoxGeometry(0.15, 0.15, 0.15);
  const cubeMaterial = new MeshBasicMaterial({ color: 0xff6b16 });
  const cube = new Mesh(cubeGeometry, cubeMaterial);
  cube.position.y = 0.1;
  marker.add(cube);
  const gateGeometry = createGatePlane(1, 1);
  const gateMaterial = new MeshBasicMaterial({ transparent: true, alphaTest: 0.01, depthWrite: false, side: DoubleSide, toneMapped: false });
  gateMaterial.forceSinglePass = true;
  const adjustmentUniforms = { gateBrightness: { value: 1 }, gateContrast: { value: 1 }, gateExposure: { value: 0 } };
  gateMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, adjustmentUniforms);
    shader.fragmentShader = 'uniform float gateBrightness;\nuniform float gateContrast;\nuniform float gateExposure;\n' + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb = max(vec3(0.0), (diffuseColor.rgb - vec3(0.18)) * gateContrast + vec3(0.18));
      diffuseColor.rgb *= gateBrightness * exp2(gateExposure);`);
  };
  gateMaterial.customProgramCacheKey = () => 'gate-appearance-v1';
  const gate = new Mesh(gateGeometry, gateMaterial);
  gate.visible = false;
  marker.add(gate);
  let texture: Texture | null = null;
  let image: GateImage | null = null;
  let presentation: GatePresentation = { ...defaultPresentation };
  let configuration: GateCalibration | null = null;
  let gateEnabled = false;
  function updateGate() {
    cube.visible = !gateEnabled;
    gate.visible = gateEnabled && !!texture && !presentation.before;
    gateMaterial.opacity = presentation.opacity;
    adjustmentUniforms.gateBrightness.value = presentation.brightness;
    adjustmentUniforms.gateContrast.value = presentation.contrast;
    adjustmentUniforms.gateExposure.value = presentation.exposure;
    if (image && texture && configuration) {
      const size = gateLayout(configuration.width, configuration.height, image.asset.widthPixels, image.asset.heightPixels, presentation.fitting, configuration.scale);
      gate.scale.set(size.width, size.height, 1);
      texture.repeat.set(size.repeatX, size.repeatY); texture.offset.set(size.offsetX, size.offsetY);
      texture.updateMatrix();
    }
  }
  const ringGeometry = new RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
  const ringMaterial = new MeshBasicMaterial({ color: 0x20ffe1, side: DoubleSide });
  const reticle = new Mesh(ringGeometry, ringMaterial);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  // The marker belongs to the world scene, never to the XR camera.
  scene.add(marker, reticle);
  return {
    scene, camera, marker, reticle,
    setGateImage(next: GateImage) {
      if (image === next) return;
      const replacement = new Texture(next.image);
      replacement.colorSpace = SRGBColorSpace;
      // HTMLImageElement source + standard PlaneGeometry UVs: top stays up.
      replacement.flipY = true;
      replacement.needsUpdate = true;
      gateMaterial.map = replacement;
      gateMaterial.needsUpdate = true;
      texture?.dispose(); texture = replacement; image = next;
      updateGate();
    },
    configureGate(config: GateCalibration, enabled: boolean) {
      configuration = config; gateEnabled = enabled; updateGate();
    },
    setPresentation(next: GatePresentation) { presentation = next; updateGate(); },
    dispose() {
      scene.clear();
      cubeGeometry.dispose(); cubeMaterial.dispose();
      ringGeometry.dispose(); ringMaterial.dispose();
      gateGeometry.dispose(); gateMaterial.dispose(); texture?.dispose(); texture = null;
    },
  };
}
