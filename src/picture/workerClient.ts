import type { Quad } from '../detection/geometry';
import type { DetectionInput } from '../detection/types';
export interface PictureRequest extends DetectionInput { type: 'reference' | 'frame'; corners?: Quad }
export interface PictureReply { corners: Quad | null; inliers: number; matches: number }
export function createPictureWorker() {
  const worker = new Worker(new URL('./tracker.worker.ts', import.meta.url), { type: 'module' });
  let pending: { resolve: (value: PictureReply) => void; reject: (reason: Error) => void } | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  function fail(message: string) { const task = pending; pending = null; clearTimeout(timeout); task?.reject(new Error(message)); }
  worker.onmessage = (event: MessageEvent<PictureReply & { ok: boolean; message?: string }>) => {
    const task = pending; pending = null; clearTimeout(timeout);
    if (!event.data.ok) task?.reject(new Error(event.data.message ?? 'Picture tracking failed.'));
    else task?.resolve(event.data);
  };
  worker.onerror = () => { closed = true; worker.terminate(); fail('Picture worker could not run. Use Photo Preview.'); };
  return {
    request(input: PictureRequest): Promise<PictureReply> {
      if (closed || pending) return Promise.reject(new Error('Picture worker is stopped or busy.'));
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        timeout = setTimeout(() => { closed = true; worker.terminate(); fail('Picture processing timed out. Stop and retry or use Photo Preview.'); }, input.type === 'reference' ? 45000 : 4000);
        try { worker.postMessage(input, [input.pixels.buffer]); } catch { fail('Could not send the camera frame.'); }
      });
    },
    dispose() { closed = true; worker.terminate(); fail('Picture tracking stopped.'); },
  };
}
