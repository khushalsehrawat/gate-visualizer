import type { GateAsset } from './assets';

export interface GateImage { asset: GateAsset; image: HTMLImageElement }
export function validateUpload(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG or WebP image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
}

export function loadGateImage(src: string, name: string, placeholder = false): Promise<GateImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      image.onload = null; image.onerror = null;
      if (image.naturalWidth < 1 || image.naturalHeight < 1 || image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        reject(new Error('Image must be 1–4096 pixels on each side. Resize it and retry.')); return;
      }
      resolve({ image, asset: { id: src, src, name, widthPixels: image.naturalWidth, heightPixels: image.naturalHeight, placeholder } });
    };
    image.onerror = () => { image.onload = null; image.onerror = null; reject(new Error('Could not decode this image. The previous gate is retained; choose a valid image or reload the sample.')); };
    image.src = src;
  });
}
