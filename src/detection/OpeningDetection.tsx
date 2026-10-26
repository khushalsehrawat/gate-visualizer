import { useEffect, useRef, useState } from 'react';
import { runDetection } from './client';
import { cornerLabels, validateQuad } from './geometry';
import type { Point, Quad } from './geometry';
import { OpeningEditor } from './OpeningEditor';
import { preparePhoto } from './photo';
import type { OpeningPhoto } from './photo';
import type { ConfirmedOpening, DetectionResult } from './types';

interface Props {
  arActive: boolean; locked: boolean;
  onBusy: (busy: boolean) => void;
  onConfirm: (opening: ConfirmedOpening | null) => void;
}
export function OpeningDetection({ arActive, locked, onBusy, onConfirm }: Props) {
  const [photo, setPhoto] = useState<OpeningPhoto | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [source, setSource] = useState<'proposal' | 'manual'>('manual');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState('');
  const [measuredHeight, setMeasuredHeight] = useState('');
  const generation = useRef(0);
  const ownedUrl = useRef<string | null>(null);
  const task = useRef<ReturnType<typeof runDetection> | null>(null);
  useEffect(() => () => { generation.current += 1; task.current?.cancel(); if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); }, []);
  const disabled = arActive || locked;
  function clearConfirmation() { setConfirmed(false); onConfirm(null); }
  function updatePoints(next: Point[]) { setPoints(next); setSource('manual'); clearConfirmation(); }
  function cancel() { generation.current += 1; task.current?.cancel(); task.current = null; setProcessing(false); onBusy(false); setError('Processing cancelled. You can mark the actual boundaries manually.'); }
  async function analyze(next: OpeningPhoto, version: number) {
    task.current = runDetection({ width: next.width, height: next.height, pixels: next.pixels.slice() });
    try {
      const detected = await task.current.promise;
      if (generation.current !== version) return;
      setResult(detected);
      if (detected.candidates[0]) { setPoints(detected.candidates[0].corners); setSource('proposal'); }
    } catch (reason) {
      if (generation.current === version) setError(reason instanceof Error ? reason.message : 'Detection failed; manual marking is available.');
    } finally { if (generation.current === version) { task.current = null; setProcessing(false); onBusy(false); } }
  }
  async function upload(file: File) {
    if (disabled) return;
    const version = ++generation.current; task.current?.cancel();
    clearConfirmation(); setProcessing(true); onBusy(true); setError(''); setResult(null); setPoints([]); setSource('manual'); setPhoto(null);
    if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); ownedUrl.current = null;
    try {
      const next = await preparePhoto(file);
      if (generation.current !== version) { URL.revokeObjectURL(next.url); return; }
      ownedUrl.current = next.url; setPhoto(next);
      await analyze(next, version);
    } catch (reason) {
      if (generation.current === version) { setError(reason instanceof Error ? reason.message : 'Photo could not be decoded. Try a JPG/PNG/WebP photo.'); setProcessing(false); onBusy(false); }
    }
  }
  const validation = photo ? validateQuad(points.map((p) => ({ x: p.x * photo.width, y: p.y * photo.height })), photo.width, photo.height) : validateQuad(points);
  const width = Number(measuredWidth), height = Number(measuredHeight);
  const metricValid = measuredWidth !== '' && measuredHeight !== '' && width >= 0.2 && width <= 20 && height >= 0.2 && height <= 10;
  return <section className="panel my-5 p-5" aria-labelledby="opening-title">
    <p className="eyebrow">Stage 4 · Separate photo workflow</p><h2 id="opening-title">Propose opening boundaries</h2>
    <p className="my-3 text-sm">Usable immersive XR camera pixels are UNVERIFIED on your device. This feature analyzes a separate photo before AR. No simultaneous camera stream is opened. Geometric proposals can identify windows or clutter; they are not gate recognition.</p>
    {arActive && <p className="text-sm font-semibold">Exit AR before taking or editing an opening photo. Existing world tracking is unchanged.</p>}
    <label className="my-4 block text-sm font-semibold">Take/select an entrance photo before AR
      <input className="mt-2 block w-full" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={disabled || processing} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} />
    </label>
    <p className="text-xs">Photograph the full inner opening nearly head-on in good light. Choose JPG/PNG/WebP up to 20 MB. Processing stays local, resized to at most 960 px; no model or photo is uploaded.</p>
    {processing && <div className="my-3"><p role="status">Loading/processing with OpenCV.js in a worker. First use loads the local WASM runtime…</p><button className="action mt-2" onClick={cancel}>Cancel detection</button></div>}
    {error && <p role="alert" className="my-3 text-sm text-red-800">{error}</p>}
    {result && <div className="my-3 text-sm"><p>{result.message}</p><p>Photo status: {result.quality}. Brightness {result.meanBrightness.toFixed(0)}/255; edge density {(result.edgeDensity * 100).toFixed(1)}%.</p>
      {!!result.candidates.length && <label className="block py-2">Unconfirmed proposal <select className="rounded border bg-white p-2" disabled={disabled || processing} onChange={(event) => { const candidate = result.candidates[Number(event.currentTarget.value)]; if (candidate) { setPoints(candidate.corners); setSource('proposal'); clearConfirmation(); } }} defaultValue="0">{result.candidates.map((candidate, i) => <option key={i} value={i}>Candidate {i + 1}: heuristic {candidate.score}/100 ({candidate.source})</option>)}</select></label>}
      <p>Scores rank geometric evidence. They are not calibrated probabilities or evidence of an actual gate opening.</p>
    </div>}
    {photo && <div className="mt-4 space-y-4">
      <button className="action" disabled={disabled || processing} onClick={() => updatePoints([])}>Mark four corners manually / clear</button>
      <OpeningEditor key={photo.url} photo={photo} points={points} onChange={updatePoints} disabled={disabled || processing} />
      <p className="text-sm">{source === 'manual' ? 'Manual selection/correction — no automatic confidence assigned.' : 'Unconfirmed geometric proposal — review every edge.'}</p>
      {validation && <p className="text-sm text-amber-900">{validation}</p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Tape-measured opening width (m)<input className="mt-1 w-full rounded border p-2" type="number" step="0.01" min="0.2" max="20" disabled={disabled} value={measuredWidth} onChange={(event) => { setMeasuredWidth(event.currentTarget.value); clearConfirmation(); }} /></label>
        <label className="text-sm">Tape-measured gate height (m)<input className="mt-1 w-full rounded border p-2" type="number" step="0.01" min="0.2" max="10" disabled={disabled} value={measuredHeight} onChange={(event) => { setMeasuredHeight(event.currentTarget.value); clearConfirmation(); }} /></label>
      </div>
      <button className="action" disabled={disabled || processing || !!validation || !metricValid} onClick={() => {
        onConfirm({ corners: points.map((p) => ({ ...p })) as Quad, source, width, height }); setConfirmed(true);
      }}>Confirm boundaries & measured dimensions</button>
      {confirmed && <p role="status" className="text-sm font-semibold">User-confirmed photo geometry and measurements saved for XR guidance. No world placement or anchor has been created.</p>}
      {points.length === 4 && <ol className="grid grid-cols-2 gap-2 text-xs">{points.map((p, i) => <li key={i}>{cornerLabels[i]}: ({p.x.toFixed(3)}, {p.y.toFixed(3)}) normalized photo coordinates</li>)}</ol>}
      <p className="text-sm">Next: Start AR at the same entrance. Re-identify photo BL and BR at the physical pillar bases using real XR hit tests, LEFT then RIGHT. Your tape measurements set width/height; the XR points set position/yaw and world up sets vertical. A photo quadrilateral or homography alone supplies no metric depth or 3D anchor.</p>
    </div>}
  </section>;
}
