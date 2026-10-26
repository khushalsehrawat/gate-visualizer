import { afterEach, expect, it, vi } from 'vitest';
import { createPictureWorker } from './workerClient';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it('keeps one camera frame in flight and rejects pending work when stopped', async () => {
  const terminate = vi.fn(), postMessage = vi.fn();
  vi.stubGlobal('Worker', class { terminate = terminate; postMessage = postMessage; });
  const worker = createPictureWorker(), frame = { type: 'frame' as const, width: 40, height: 40, pixels: new Uint8ClampedArray(6400) };
  const pending = worker.request(frame), rejection = expect(pending).rejects.toThrow('stopped');
  await expect(worker.request(frame)).rejects.toThrow('busy'); expect(postMessage).toHaveBeenCalledOnce();
  worker.dispose(); await rejection; expect(terminate).toHaveBeenCalledOnce();
});
it('terminates a stalled worker instead of growing a camera-frame queue', async () => {
  vi.useFakeTimers(); const terminate = vi.fn();
  vi.stubGlobal('Worker', class { terminate = terminate; postMessage = vi.fn(); });
  const worker = createPictureWorker();
  const pending = worker.request({ type: 'frame', width: 40, height: 40, pixels: new Uint8ClampedArray(6400) });
  const rejection = expect(pending).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(4000); await rejection; expect(terminate).toHaveBeenCalledOnce();
});
