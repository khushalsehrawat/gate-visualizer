import type { GateImage } from '../gates/loadImage';
import type { CompositeRequest, Raster } from './model';
export function imageRaster(gate: GateImage): Raster {
  const canvas = document.createElement('canvas'); const scale = Math.min(1, 2048 / Math.max(gate.asset.widthPixels, gate.asset.heightPixels)); canvas.width = Math.max(1, Math.round(gate.asset.widthPixels * scale)); canvas.height = Math.max(1, Math.round(gate.asset.heightPixels * scale));
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('Image processing is unavailable.');
    context.drawImage(gate.image, 0, 0, canvas.width, canvas.height); return { width: canvas.width, height: canvas.height, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
  } finally { canvas.width = 0; canvas.height = 0; }
}
export function rasterBlob(raster: Raster): Promise<Blob> {
  const canvas = document.createElement('canvas'); canvas.width = raster.width; canvas.height = raster.height;
  return new Promise<Blob>((resolve, reject) => {
    try {
      const context = canvas.getContext('2d'); if (!context) throw new Error('Photo export is unavailable.');
      context.putImageData(new ImageData(new Uint8ClampedArray(raster.pixels), raster.width, raster.height), 0, 0);
      canvas.toBlob((blob) => { canvas.width = 0; canvas.height = 0; if (blob) resolve(blob); else reject(new Error('PNG encoding failed.')); }, 'image/png');
    } catch (reason) { canvas.width = 0; canvas.height = 0; reject(reason); }
  });
}
export function renderPhoto(input: CompositeRequest) {
  let worker: Worker | null = null;
  let rejectTask: (reason: Error) => void = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => { if (timer) clearTimeout(timer); worker?.terminate(); worker = null; };
  const promise = new Promise<Uint8ClampedArray>((resolve, reject) => {
    rejectTask = reject;
    try {
      worker = new Worker(new URL('./compositor.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<{ ok: boolean; pixels?: Uint8ClampedArray; message?: string }>) => { cleanup(); if (event.data.ok && event.data.pixels) resolve(event.data.pixels); else reject(new Error(event.data.message ?? 'Photo render failed.')); };
      worker.onerror = () => { cleanup(); reject(new Error('Photo worker could not run. Check browser support and try again.')); };
      timer = setTimeout(() => { cleanup(); reject(new Error('Photo rendering timed out. Reduce photo size and retry.')); }, 30000);
      worker.postMessage(input); // Structured clone preserves editor source pixels for later edits.
    } catch { cleanup(); reject(new Error('This browser cannot start the photo worker. Try current Chrome, Safari or Firefox.')); }
  });
  return { promise, cancel: () => { cleanup(); rejectTask(new Error('Photo render cancelled.')); } };
}
