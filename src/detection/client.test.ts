import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDetection } from './client';
const workers: FakeWorker[] = [];
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn(); postMessage = vi.fn();
  constructor() { workers.push(this); }
}
const input = () => ({ width: 32, height: 32, pixels: new Uint8ClampedArray(32 * 32 * 4) });
beforeEach(() => { workers.length = 0; vi.stubGlobal('Worker', FakeWorker); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('detector worker lifecycle', () => {
  it('transfers pixels and terminates the worker on completion', async () => {
    const task = runDetection(input());
    const result = { candidates: [], quality: 'no-opening', message: 'No opening', meanBrightness: 100, edgeDensity: 0.01 };
    workers[0]!.onmessage!({ data: { ok: true, result } } as MessageEvent);
    await expect(task.promise).resolves.toEqual(result);
    expect(workers[0]!.postMessage).toHaveBeenCalledWith(expect.objectContaining({ width: 32 }), [expect.any(ArrayBuffer)]);
    expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  });
  it('rejects processing failures without a substituted rectangle', async () => {
    const task = runDetection(input());
    workers[0]!.onmessage!({ data: { ok: false, message: 'WASM blocked' } } as MessageEvent);
    await expect(task.promise).rejects.toThrow('WASM blocked');
    expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  });
  it('cancels work and clears the runtime through worker termination', async () => {
    const task = runDetection(input()); task.cancel();
    await expect(task.promise).rejects.toThrow(/cancelled/);
    expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  });
  it('times out and terminates stuck initialization/processing', async () => {
    vi.useFakeTimers();
    const task = runDetection(input()); const failed = expect(task.promise).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(45000); await failed;
    expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  });
});
