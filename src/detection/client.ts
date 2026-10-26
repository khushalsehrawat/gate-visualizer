import type { DetectionInput, DetectionResult, WorkerReply } from './types';

export function runDetection(input: DetectionInput) {
  let worker: Worker | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectTask: (reason: Error) => void = () => {};
  function cleanup() { if (timeout) clearTimeout(timeout); worker?.terminate(); worker = null; }
  const promise = new Promise<DetectionResult>((resolve, reject) => {
    rejectTask = reject;
    try {
      worker = new Worker(new URL('./detector.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        cleanup();
        if (event.data.ok) resolve(event.data.result); else reject(new Error(event.data.message));
      };
      worker.onerror = () => { cleanup(); reject(new Error('Detection worker could not run. Manual marking is available; no default rectangle was used.')); };
      timeout = setTimeout(() => { cleanup(); reject(new Error('Detection timed out. Retry on a smaller/clearer photo or mark manually.')); }, 45000);
      worker.postMessage(input, [input.pixels.buffer]);
    } catch { cleanup(); reject(new Error('Web Workers are unavailable. Mark the photo corners manually.')); }
  });
  return { promise, cancel: () => { cleanup(); rejectTask(new Error('Detection cancelled.')); } };
}
