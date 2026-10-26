import opencvUrl from '@techstark/opencv-js/dist/opencv.js?url';
import { detectOpening } from './engine';
import type { OpenCV } from './engine';
import type { DetectionInput, WorkerReply } from './types';

const scope = self as unknown as {
  cv?: OpenCV | Promise<OpenCV>;
  onmessage: ((event: MessageEvent<DetectionInput>) => void) | null;
  postMessage: (reply: WorkerReply) => void;
};
let runtime: Promise<OpenCV> | null = null;
async function loadRuntime() {
  // Execute the pinned UMD build as a same-origin module. It installs globalThis.cv.
  // WASM is embedded in the dependency; no CDN/model or unsafe JS eval is used.
  await import(/* @vite-ignore */ opencvUrl);
  const cv = await scope.cv;
  if (!cv?.Mat || !cv.Canny || !cv.HoughLinesP) throw new Error('OpenCV runtime did not initialize.');
  return cv;
}
scope.onmessage = (event) => {
  void (async () => {
    try {
      runtime ??= loadRuntime();
      const cv = await runtime;
      scope.postMessage({ ok: true, result: detectOpening(cv, event.data) });
    } catch {
      scope.postMessage({ ok: false, message: 'OpenCV processing failed or WASM was blocked. Retake/retry, check deployment policy, or mark corners manually. No automatic result was substituted.' });
    }
  })();
};
