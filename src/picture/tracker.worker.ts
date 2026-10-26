import opencvUrl from '@techstark/opencv-js/dist/opencv.js?url';
import type { OpenCV } from '../detection/engine';
import type { Quad } from '../detection/geometry';
import { trackedOpening } from './tracking';
import type { PictureRequest } from './workerClient';

const scope = self as unknown as { cv?: OpenCV | Promise<OpenCV>; onmessage: ((event: MessageEvent<PictureRequest>) => void) | null; postMessage: (value: unknown) => void };
type Mat = InstanceType<OpenCV['Mat']>;
let cv: OpenCV, runtime: Promise<void> | null = null;
let referenceDescriptors: Mat | null = null;
let referenceKeys: InstanceType<OpenCV['KeyPointVector']> | null = null;
let original: Quad | null = null;
let detector: InstanceType<OpenCV['ORB']>;
async function initialize() {
  await import(/* @vite-ignore */ opencvUrl);
  cv = await scope.cv as OpenCV;
  if (!cv?.ORB || !cv.findHomography || !cv.BFMatcher) throw new Error('This OpenCV build cannot track pictures. Use Photo Preview.');
  detector = new cv.ORB(320);
}
function process(input: PictureRequest) {
  if (input.width < 32 || input.height < 32 || input.width > 480 || input.height > 480 || input.pixels.length !== input.width * input.height * 4) throw new Error('Invalid camera frame.');
  const resources: { delete(): void }[] = [];
  const own = <T extends { delete(): void }>(value: T) => { resources.push(value); return value; };
  try {
    const rgba = own(cv.matFromArray(input.height, input.width, cv.CV_8UC4, input.pixels));
    const gray = own(new cv.Mat()); cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(gray, gray);
    const mask = own(new cv.Mat());
    if (input.type === 'reference') {
      referenceDescriptors?.delete(); referenceDescriptors = null;
      referenceKeys?.delete(); referenceKeys = null; original = null;
      if (!input.corners) throw new Error('Confirm four opening points first.');
      const q = input.corners.map((p) => ({ x: p.x * input.width, y: p.y * input.height })) as Quad;
      const polygon = own(cv.matFromArray(4, 1, cv.CV_32SC2, q.flatMap((p) => [Math.round(p.x), Math.round(p.y)])));
      const featureMask = own(cv.Mat.zeros(input.height, input.width, cv.CV_8UC1));
      cv.fillConvexPoly(featureMask, polygon, new cv.Scalar(255));
      const keys = own(new cv.KeyPointVector()), descriptors = own(new cv.Mat());
      detector.detectAndCompute(gray, featureMask, keys, descriptors);
      if (keys.size() < 20 || descriptors.empty()) throw new Error('Not enough distinctive detail inside this opening. Use a sharper/larger picture or Photo Preview.');
      referenceDescriptors = descriptors.clone(); referenceKeys = new cv.KeyPointVector();
      for (let i = 0; i < keys.size(); i++) referenceKeys.push_back(keys.get(i));
      original = q;
      return { corners: null, inliers: 0, matches: 0 };
    }
    if (!referenceDescriptors || !referenceKeys || !original) throw new Error('Set a reference picture first.');
    const keys = own(new cv.KeyPointVector()), descriptors = own(new cv.Mat());
    detector.detectAndCompute(gray, mask, keys, descriptors);
    const lost = { corners: null, inliers: 0, matches: 0 };
    if (descriptors.rows < 2) return lost;
    const matcher = own(new cv.BFMatcher(cv.NORM_HAMMING, false)), pairs = own(new cv.DMatchVectorVector());
    matcher.knnMatch(referenceDescriptors, descriptors, pairs, 2);
    const from: number[] = [], to: number[] = [], used = new Set<number>();
    for (let i = 0; i < pairs.size(); i++) {
      const pair = pairs.get(i);
      try {
        if (pair.size() < 2) continue;
        const best = pair.get(0), second = pair.get(1);
        if (best.distance >= 64 || best.distance >= second.distance * 0.72 || used.has(best.trainIdx)) continue;
        used.add(best.trainIdx);
        const a = referenceKeys.get(best.queryIdx).pt, b = keys.get(best.trainIdx).pt;
        from.push(a.x, a.y); to.push(b.x, b.y);
      } finally { pair.delete(); }
    }
    const matches = from.length / 2;
    if (matches < 10) return { ...lost, matches };
    const a = own(cv.matFromArray(matches, 1, cv.CV_32FC2, from)), b = own(cv.matFromArray(matches, 1, cv.CV_32FC2, to)), inlierMask = own(new cv.Mat());
    const matrix = own(cv.findHomography(a, b, cv.RANSAC, 3, inlierMask, 800, 0.99));
    if (matrix.empty()) return { ...lost, matches };
    const spread = [];
    for (let i = 0; i < matches; i++) if (inlierMask.data[i]) spread.push({ x: from[i * 2]!, y: from[i * 2 + 1]! });
    return { corners: trackedOpening(Array.from(matrix.data64F), original, input.width, input.height, matches, spread.length, spread), matches, inliers: spread.length };
  } finally { for (const resource of resources.reverse()) resource.delete(); }
}
scope.onmessage = (event) => {
  void (async () => {
    try { runtime ??= initialize(); await runtime; scope.postMessage({ ok: true, ...process(event.data) }); }
    catch (reason) { scope.postMessage({ ok: false, message: reason instanceof Error ? reason.message : 'Picture tracking failed. Use Photo Preview.' }); }
  })();
};
