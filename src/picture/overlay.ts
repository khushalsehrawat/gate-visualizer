import { LinearFilter, Matrix3, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, Texture, Vector4, WebGLRenderer } from 'three';
import type { GateImage } from '../gates/loadImage';
import type { Quad } from '../detection/geometry';
import { homography, inverse } from '../photo/projective';
import { defaultPictureFit, pictureLayout } from './fitting';
import type { PictureFit } from './fitting';

// A projective image-space renderer driven by measured feature matches, never an XR anchor.
export function createPictureOverlay(canvas: HTMLCanvasElement, width: number, height: number, gate: GateImage) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(width, height, false); renderer.setClearColor(0, 0);
  let source: HTMLImageElement | HTMLCanvasElement = gate.image;
  const ratio = Math.min(1, 1024 / Math.max(gate.asset.widthPixels, gate.asset.heightPixels));
  if (ratio < 1) {
    const small = document.createElement('canvas'); small.width = Math.round(gate.asset.widthPixels * ratio); small.height = Math.round(gate.asset.heightPixels * ratio);
    const context = small.getContext('2d');
    if (context) { context.drawImage(gate.image, 0, 0, small.width, small.height); source = small; }
  }
  const texture = new Texture(source); texture.colorSpace = SRGBColorSpace; texture.generateMipmaps = false; texture.minFilter = LinearFilter; texture.needsUpdate = true;
  const uniforms = { gate: { value: texture }, inverseOpening: { value: new Matrix3() }, opacity: { value: 1 }, bounds: { value: new Vector4() }, crop: { value: new Vector4() } };
  const material = new ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms,
    vertexShader: 'varying vec2 positionUV; void main(){ positionUV=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: `uniform sampler2D gate; uniform mat3 inverseOpening; uniform float opacity; uniform vec4 bounds; uniform vec4 crop; varying vec2 positionUV;
      void main(){ vec3 p=inverseOpening*vec3(positionUV.x,1.0-positionUV.y,1.0);
        if(abs(p.z)<0.00001) discard; vec2 q=p.xy/p.z;
        if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0) discard;
        q=(q-bounds.xy)/bounds.zw; if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0) discard;
        q=crop.xy+q*crop.zw;
        gl_FragColor=texture2D(gate,vec2(q.x,1.0-q.y)); gl_FragColor.a*=opacity;
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new PlaneGeometry(2, 2), scene = new Scene(), camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new Mesh(geometry, material));
  return {
    show(corners: Quad, opacity: number, fitting: PictureFit = defaultPictureFit) {
      const layout = pictureLayout(fitting, gate.asset.widthPixels, gate.asset.heightPixels);
      uniforms.bounds.value.set(layout.left, layout.top, layout.width, layout.height);
      uniforms.crop.value.set(layout.offsetX, layout.offsetY, layout.repeatX, layout.repeatY);
      const h = inverse(homography(corners)); uniforms.inverseOpening.value.set(...h); uniforms.opacity.value = opacity;
      renderer.render(scene, camera); canvas.hidden = false;
    },
    hide() { canvas.hidden = true; },
    dispose() { canvas.hidden = true; scene.clear(); geometry.dispose(); material.dispose(); texture.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}
