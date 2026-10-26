import type { DetectionInput } from './types';
export interface OpeningPhoto extends DetectionInput { url: string; blob?: Blob }
export async function preparePhoto(file: File, maxSide = 960): Promise<OpeningPhoto> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Choose a PNG/JPG/WebP photo up to 20 MB.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    if (bitmap.width < 32 || bitmap.height < 32 || bitmap.width > 16384 || bitmap.height > 16384) throw new Error('Photo dimensions are unsupported. Retake or resize it.');
    const factor = Math.min(1, Math.min(2048, Math.max(32, maxSide)) / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * factor), height = Math.round(bitmap.height * factor);
    if (Math.min(width, height) < 32) throw new Error('Use a less extreme photo aspect ratio.');
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Photo canvas is unavailable.');
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Photo preview failed.')), 'image/png'));
    return { width, height, pixels, url: URL.createObjectURL(blob), blob };
  } finally { bitmap.close(); }
}
