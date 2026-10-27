import { BoxGeometry, DoubleSide, Group, LinearFilter, Mesh, MeshBasicMaterial, PerspectiveCamera, RingGeometry, Scene, SRGBColorSpace, Texture, WebGLRenderer } from 'three';
import { createGatePlane } from '../geometry/gatePlane';
import { gateLayout } from '../geometry/fitting';
import { defaultPresentation } from '../gates/presentation';
import type { GatePresentation } from '../gates/presentation';
import type { GateCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';

export type XRRenderer = Pick<WebGLRenderer, 'domElement' | 'xr' | 'setAnimationLoop' | 'render' | 'dispose' | 'forceContextLoss' | 'setSize' | 'setPixelRatio' | 'setClearColor'> & Partial<Pick<WebGLRenderer, 'info'>>;

export function createXRRenderer(): XRRenderer {
  return new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance', stencil: false });
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
  let requestedImage: GateImage | null = null;
  let imageVersion = 0;
  let ownedBitmap: ImageBitmap | null = null;
  function commitImage(next: GateImage, source: HTMLImageElement | HTMLCanvasElement | ImageBitmap, bitmap: ImageBitmap | null = null) {
    const replacement = new Texture(source);
    replacement.generateMipmaps = false; replacement.minFilter = LinearFilter;
    replacement.colorSpace = SRGBColorSpace;
    replacement.flipY = !bitmap; // ImageBitmap was explicitly flipped during worker-backed resize.
    replacement.needsUpdate = true;
    const hadMap = !!gateMaterial.map;
    gateMaterial.map = replacement;
    if (!hadMap) gateMaterial.needsUpdate = true;
    texture?.dispose(); ownedBitmap?.close(); ownedBitmap = bitmap;
    texture = replacement; image = next; updateGate();
  }
  function fallbackImage(next: GateImage) {
    const longest = Math.max(next.asset.widthPixels, next.asset.heightPixels);
    if (longest <= 2048) { commitImage(next, next.image); return; }
    const canvas = document.createElement('canvas'), ratio = 2048 / longest;
    canvas.width = Math.max(1, Math.round(next.asset.widthPixels * ratio)); canvas.height = Math.max(1, Math.round(next.asset.heightPixels * ratio));
    const context = canvas.getContext('2d');
    if (context) { context.drawImage(next.image, 0, 0, canvas.width, canvas.height); commitImage(next, canvas); }
    // Keep the previous texture if no bounded resize path is available.
  }
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
  // A separate world-space reminder of the captured LEFT bottom point.
  const leftMaterial = new MeshBasicMaterial({ color: 0xffb547, side: DoubleSide });
  const leftBase = new Mesh(ringGeometry, leftMaterial);
  leftBase.matrixAutoUpdate = false;
  leftBase.visible = false;
  // The marker belongs to the world scene, never to the XR camera.
  scene.add(marker, reticle, leftBase);
  return {
    scene, camera, marker, reticle, leftBase,
    get gateReady() { return !!texture && image === requestedImage; },
    setGateImage(next: GateImage) {
      if (requestedImage === next) return;
      requestedImage = next;
      const version = ++imageVersion;
      const longest = Math.max(next.asset.widthPixels, next.asset.heightPixels);
      if (longest > 2048 && typeof createImageBitmap === 'function') {
        const ratio = 2048 / longest;
        return createImageBitmap(next.image, { resizeWidth: Math.max(1, Math.round(next.asset.widthPixels * ratio)), resizeHeight: Math.max(1, Math.round(next.asset.heightPixels * ratio)), resizeQuality: 'medium', imageOrientation: 'flipY', premultiplyAlpha: 'none' })
          .then((bitmap) => { if (version !== imageVersion) { bitmap.close(); return; } commitImage(next, bitmap, bitmap); })
          .catch(() => { if (version === imageVersion) fallbackImage(next); });
      }
      fallbackImage(next);
    },
    configureGate(config: GateCalibration, enabled: boolean) {
      configuration = config; gateEnabled = enabled; updateGate();
    },
    setPresentation(next: GatePresentation) { presentation = next; updateGate(); },
    dispose() {
      ++imageVersion; requestedImage = null;
      scene.clear();
      cubeGeometry.dispose(); cubeMaterial.dispose();
      ringGeometry.dispose(); ringMaterial.dispose(); leftMaterial.dispose();
      gateGeometry.dispose(); gateMaterial.dispose(); texture?.dispose(); texture = null; ownedBitmap?.close(); ownedBitmap = null;
    },
  };
}
