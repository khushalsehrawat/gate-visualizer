import { useCallback, useEffect, useRef, useState } from 'react';
import { useGateLibrary } from '../gates/GateProvider';
import { OpeningEditor } from '../detection/OpeningEditor';
import { cornerLabels, validateQuad } from '../detection/geometry';
import type { Point, Quad } from '../detection/geometry';
import type { OpeningPhoto } from '../detection/photo';
import { runDetection } from '../detection/client';
import { capturePictureFrame, PictureCamera, pictureFrame } from './camera';
import { createPictureWorker } from './workerClient';
import type { createPictureOverlay } from './overlay';
import { PictureHealth, pictureEvidenceLifetime } from './health';
import { defaultPictureFit, regionAspect } from './fitting';
import type { PictureFit } from './fitting';
import { ReviewGatePreview } from './ReviewGatePreview';

export default function LivePicture({ onActiveChange }: { onActiveChange?: (active: boolean) => void } = {}) {
  const { gate, load, loading, error: gateError } = useGateLibrary();
  const video = useRef<HTMLVideoElement>(null), overlayCanvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef(new PictureCamera()), sampling = useRef<HTMLCanvasElement | null>(null);
  const worker = useRef<ReturnType<typeof createPictureWorker> | null>(null);
  const overlay = useRef<ReturnType<typeof createPictureOverlay> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), stale = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0), frozenUrl = useRef<string | null>(null);
  const detection = useRef<ReturnType<typeof runDetection> | null>(null);
  const [state, setState] = useState<'idle' | 'starting' | 'camera' | 'review' | 'loading' | 'tracking'>('idle');
  useEffect(() => { onActiveChange?.(state !== 'idle'); return () => { onActiveChange?.(false); }; }, [state, onActiveChange]);
  const [message, setMessage] = useState('Point at an entrance picture on paper or another screen. This is 2D picture tracking, separate from real-entrance AR.');
  const [error, setError] = useState(''), [photo, setPhoto] = useState<OpeningPhoto | null>(null), [points, setPoints] = useState<Point[]>([]);
  const [checks, setChecks] = useState([false, false, false, false]), [detecting, setDetecting] = useState(false);
  const opacity = useRef(1); const [alpha, setAlpha] = useState(1);
  const fit = useRef<PictureFit>({ ...defaultPictureFit }); const [fitting, setFitting] = useState<PictureFit>({ ...defaultPictureFit });
  const evidence = useRef<{ corners: Quad; time: number } | null>(null);
  const [manualRegion, setManualRegion] = useState(false);
  function autoFit(next: Point[], source: OpeningPhoto | null = photo) {
    if (source && !validateQuad(next, 1, 1, true)) {
      const value = { ...defaultPictureFit, aspect: regionAspect(next as Quad, source.width, source.height) };
      fit.current = value; setFitting(value);
    }
  }
  const releaseTracking = useCallback(() => {
    ++generation.current; clearTimeout(timer.current); clearTimeout(stale.current);
    evidence.current = null;
    worker.current?.dispose(); worker.current = null; overlay.current?.dispose(); overlay.current = null;
    detection.current?.cancel(); detection.current = null;
  }, []);
  const stop = useCallback(() => {
    releaseTracking(); camera.current.stop(); if (video.current) video.current.srcObject = null;
    setState('idle'); setDetecting(false); setMessage('Camera stopped. Restart to select a picture.');
  }, [releaseTracking]);
  useEffect(() => {
    const deviceCamera = camera.current;
    const onHidden = () => { if (document.visibilityState === 'hidden') stop(); };
    window.addEventListener('pagehide', stop); document.addEventListener('visibilitychange', onHidden);
    return () => {
      releaseTracking(); deviceCamera.stop(); if (frozenUrl.current) URL.revokeObjectURL(frozenUrl.current);
      window.removeEventListener('pagehide', stop); document.removeEventListener('visibilitychange', onHidden);
    };
  }, [releaseTracking, stop]);
  async function start() {
    stop(); setError(''); setPhoto(null); setPoints([]); setChecks([false, false, false, false]); setState('starting');
    const version = generation.current;
    try {
      if (!video.current) return;
      const started = await camera.current.start(video.current, () => { stop(); setError('Camera stream ended. Restart the picture camera.'); });
      if (started && version === generation.current) { setState('camera'); setMessage('Point at the picture. Hold still, then tap Select opening.'); }
    } catch (reason) { if (version === generation.current) { setState('idle'); setError(reason instanceof Error ? reason.message : 'Camera permission was denied or the camera is busy.'); } }
  }
  async function freeze() {
    if (!video.current) return;
    releaseTracking(); setError(''); setDetecting(false);
    try {
      const canvas = sampling.current ??= document.createElement('canvas');
      const version = generation.current;
      const { blob, ...frame } = await capturePictureFrame(video.current, canvas);
      if (generation.current !== version) return;
      if (frozenUrl.current) URL.revokeObjectURL(frozenUrl.current);
      const url = URL.createObjectURL(blob); frozenUrl.current = url;
      const next = { ...frame, url, blob };
      setPhoto(next); setPoints([]); setChecks([false, false, false, false]); setManualRegion(false); setState('review');
      setMessage('Finding an area to fit your gate. You can also choose the region manually.');
      void suggest(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not freeze frame.'); }
  }
  async function suggest(source = photo) {
    if (!source) return;
    setDetecting(true); setError(''); const version = generation.current;
    try {
      detection.current = runDetection({ width: source.width, height: source.height, pixels: source.pixels.slice() });
      const result = await detection.current.promise;
      if (version !== generation.current) return;
      setPoints(result.candidates[0]?.corners ?? []); setChecks([false, false, false, false]);
      autoFit(result.candidates[0]?.corners ?? [], source);
      setManualRegion(!result.candidates[0]);
      setMessage(result.candidates[0] ? `Unconfirmed geometric proposal, heuristic ${result.candidates[0].score}/100. Check every corner; not a recognition probability.` : result.message + ' Mark corners manually.');
    } catch (reason) { if (version === generation.current) { setError(reason instanceof Error ? reason.message : 'Detection failed.'); setManualRegion(true); } }
    finally { if (version === generation.current) { setDetecting(false); detection.current = null; } }
  }
  async function track() {
    if (!photo || !gate || !overlayCanvas.current || validateQuad(points, 1, 1, true) || !checks.every(Boolean)) return;
    releaseTracking(); const version = generation.current; setState('loading'); setError(''); setMessage('Loading local feature tracking. First use may take a moment…');
    try {
      const tracker = createPictureWorker(); worker.current = tracker;
      await tracker.request({ type: 'reference', width: photo.width, height: photo.height, pixels: photo.pixels.slice(), corners: points as Quad });
      if (version !== generation.current) return;
      const { createPictureOverlay } = await import('./overlay');
      if (version !== generation.current || !overlayCanvas.current) return;
      overlay.current = createPictureOverlay(overlayCanvas.current, photo.width, photo.height, gate);
      const health = new PictureHealth();
      overlay.current.hide(); setState('tracking'); setMessage('Searching for the confirmed picture. Move slowly. Gate hides whenever feature evidence is insufficient.');
      const step = async () => {
        if (version !== generation.current || !video.current) return;
        const began = performance.now();
        try {
          const frame = pictureFrame(video.current, sampling.current ??= document.createElement('canvas'));
          if (frame.width !== photo.width || frame.height !== photo.height) throw new Error('Camera orientation changed. Freeze and confirm the picture again.');
          const result = await tracker.request({ ...frame, type: 'frame' });
          if (version !== generation.current) return;
          const now = performance.now(), decision = health.accept(result.corners, began, now);
          setMessage(decision.message);
          clearTimeout(stale.current);
          if (decision.visible && result.corners) {
            evidence.current = { corners: result.corners, time: began };
            overlay.current?.show(result.corners, opacity.current, fit.current);
            stale.current = setTimeout(() => { overlay.current?.hide(); evidence.current = null; setMessage(health.accept(null, began, performance.now()).message); }, Math.max(0, pictureEvidenceLifetime - (now - began)));
          } else { evidence.current = null; overlay.current?.hide(); }
          timer.current = setTimeout(() => { void step(); }, Math.max(0, 170 - (performance.now() - began)));
        } catch (reason) { if (version === generation.current) { releaseTracking(); setState('camera'); setError(reason instanceof Error ? reason.message : 'Picture tracking failed.'); } }
      };
      void step();
    } catch (reason) { if (version === generation.current) { releaseTracking(); setState('review'); setError(reason instanceof Error ? reason.message : 'Could not initialize tracking.'); } }
  }
  function changeFit(next: PictureFit) {
    fit.current = next; setFitting(next);
    if (evidence.current && performance.now() - evidence.current.time <= pictureEvidenceLifetime) overlay.current?.show(evidence.current.corners, opacity.current, next);
  }
  const validation = validateQuad(points, 1, 1, true);
  return <div className={`picture-page ${state !== 'idle' ? 'camera-is-open' : ''}`}>
    <div className="page-intro simple-intro" hidden={state !== 'idle'}><h1>Live Picture Preview</h1><p>Choose your gate, open the camera, then select the opening in your picture.</p></div>
    {(state === 'idle' || (state === 'review' && !gate)) && <label className="field-label">Gate image for picture tracking<input type="file" accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void load(file); event.currentTarget.value = ''; }} /></label>}
    {state === 'idle' && <p className="fine-print">{gate ? `Selected: ${gate.asset.name}` : 'Upload now or after opening the camera.'} · Transparent PNG works best.</p>}
    <div className="button-row picture-start-controls">
      {state === 'idle' && <button className="primary-button" aria-label="Start picture camera" onClick={() => { void start(); }}>Open camera</button>}
      {['camera', 'tracking'].includes(state) && <button className="primary-button" aria-label="Freeze picture / select again" onClick={() => { void freeze(); }}>{state === 'tracking' ? 'Choose another region' : 'Select opening'}</button>}
      {state !== 'idle' && <button className="secondary-button" aria-label="Stop picture camera" onClick={stop}>Close camera</button>}
    </div>
    <div className="picture-camera" hidden={state === 'idle' || state === 'review'}>
      <video ref={video} muted playsInline aria-label="Live camera for entrance picture tracking" />
      <canvas ref={overlayCanvas} hidden aria-label="Feature-tracked 2D gate" />
    </div>
    <p role="status" className="form-notice">{message}</p>{(error || gateError) && <p role="alert" className="form-error">{error || gateError}</p>}
    {state === 'review' && photo && <section className="picture-review"><h2>Your gate, fitted to the area</h2>
      {!manualRegion && !validation && gate && <ReviewGatePreview gate={gate} photo={photo} corners={points as Quad} fitting={fitting} opacity={alpha} />}
      <div className="button-row"><button className="secondary-button" aria-label="Suggest points" disabled={detecting} onClick={() => { void suggest(); }}>{detecting ? 'Finding area…' : 'Auto-select area'}</button><button className="primary-button" disabled={!!validation} onClick={() => { autoFit(points); setManualRegion(false); setMessage('Gate fitted inside the selected area. Review all four points before starting live tracking.'); }}>Auto-fit gate</button></div>
      <details className="simple-options" open={manualRegion} onToggle={(event) => setManualRegion(event.currentTarget.open)}><summary>Manual region</summary>
      <OpeningEditor photo={photo} points={points} disabled={detecting} onChange={(next) => { setPoints(next); autoFit(next); setChecks([false, false, false, false]); }} />
      <button className="text-link" aria-label="Select any region manually / clear points" disabled={detecting} onClick={() => { setPoints([]); setChecks([false, false, false, false]); setMessage('Select any visible region manually: top-left, top-right, bottom-right, bottom-left. No automatic rectangle is supplied. A blank region may not have enough detail for live tracking.'); }}>Clear points</button>
      </details>
      {validation && <p>{validation}</p>}
      {!validation && <fieldset className="corner-confirmation"><legend>Review all four points</legend>{cornerLabels.map((label, i) => <label key={label}><input type="checkbox" checked={checks[i]} onChange={(event) => { const checked = event.currentTarget.checked; setChecks((previous) => previous.map((value, index) => index === i ? checked : value)); }} />{label} is correct</label>)}</fieldset>}
      <button className="primary-button" aria-label="Confirm points & track picture live" disabled={detecting || !!validation || !checks.every(Boolean) || !gate} onClick={() => { void track(); }}>Confirm & track live</button>
    </section>}
    <details className="picture-fitting simple-options"><summary>Adjust gate</summary>
      <label className="field-label">Picture fitting mode<select value={fitting.mode} onChange={(event) => changeFit({ ...fitting, mode: event.currentTarget.value as PictureFit['mode'] })}><option value="fit">Auto-fit inside area — keep proportions</option><option value="fill">Fill all four corners — stretch image</option><option value="crop">Crop to fill region — preserve image proportions</option></select></label>
      <label className="field-label">Region width / height ratio (estimate)<input type="number" min="0.05" max="20" step="0.05" value={fitting.aspect} onChange={(event) => { const value = event.currentTarget.valueAsNumber; if (value >= .05 && value <= 20) changeFit({ ...fitting, aspect: value }); }} /></label>
      {([['width', 'Gate width', .2, 2], ['height', 'Gate height', .2, 2], ['x', 'Horizontal adjustment', -.5, .5], ['y', 'Vertical adjustment', -.5, .5]] as const).map(([key, label, min, max]) => <label className="field-label" key={key}>{label}: {fitting[key].toFixed(2)}<input type="range" min={min} max={max} step="0.01" value={fitting[key]} onChange={(event) => changeFit({ ...fitting, [key]: event.currentTarget.valueAsNumber })} /></label>)}
      <button className="secondary-button" onClick={() => autoFit(points)}>Reset fit to region</button>
      <p className="fine-print">Fill maps artwork to your confirmed corners. Fit/Crop use the editable layout ratio; it is not a depth measurement. Adjustments are clipped to the selected region. Select four actual corners first; arbitrary blank areas cannot be reliably tracked.</p>
    <label className="field-label">Picture gate opacity <input type="range" min="0" max="1" step="0.05" value={alpha} onChange={(event) => { const value = event.currentTarget.valueAsNumber; opacity.current = value; setAlpha(value); }} /></label>
    </details>
    <details className="simple-options"><summary>Help & compatibility</summary><p className="fine-print">Keep the picture still and move slowly. This is 2D picture tracking, not a world anchor. Blank regions, glare and repeated patterns can prevent matching. Physical Samsung M34 validation: UNVERIFIED. Close this camera before starting real AR.</p><a className="text-link" href="#/photo">Use a saved entrance photo →</a></details>
  </div>;
}
