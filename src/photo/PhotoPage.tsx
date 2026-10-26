import { useCallback, useEffect, useRef, useState } from 'react';
import { useGateLibrary } from '../gates/GateProvider';
import { gateCatalogue } from '../gates/assets';
import { preparePhoto } from '../detection/photo';
import type { OpeningPhoto } from '../detection/photo';
import { OpeningEditor } from '../detection/OpeningEditor';
import { validateQuad } from '../detection/geometry';
import type { Point, Quad } from '../detection/geometry';
import { runDetection } from '../detection/client';
import { imageRaster, rasterBlob, renderPhoto } from './browser';
import { defaultPhotoSettings } from './model';
import type { PhotoSettings, SavedProject } from './model';
import { saveProject } from '../storage/projects';

interface Props { enabled: boolean; restored: SavedProject | null }
export default function PhotoPage({ enabled, restored }: Props) {
  const { gate, loading: gateLoading, error: gateError, load } = useGateLibrary();
  const [photo, setPhoto] = useState<OpeningPhoto | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [settings, setSettings] = useState<PhotoSettings>({ ...defaultPhotoSettings });
  const [before, setBefore] = useState(false), [loading, setLoading] = useState(false), [detecting, setDetecting] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [name, setName] = useState('My entrance');
  const [recordId, setRecordId] = useState<string | null>(null), [saving, setSaving] = useState(false);
  const [composite, setComposite] = useState<{ key: string; blob: Blob; url: string } | null>(null);
  const photoUrl = useRef<string | null>(null), outputUrl = useRef<string | null>(null), photoVersion = useRef(0);
  const detection = useRef<ReturnType<typeof runDetection> | null>(null);
  const createdAt = useRef<number | null>(null);
  const validation = photo ? validateQuad(points.map((p) => ({ x: p.x * photo.width, y: p.y * photo.height })), photo.width, photo.height) : 'Add an entrance photograph to begin.';
  const renderKey = photo && gate && !validation ? JSON.stringify([photo.url, gate.asset.src, points, settings]) : '';
  const ready = !!renderKey && composite?.key === renderKey;
  const canExport = ready && !loading && !detecting && !gateLoading;

  useEffect(() => () => { photoVersion.current += 1; detection.current?.cancel(); if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); if (outputUrl.current) URL.revokeObjectURL(outputUrl.current); }, []);
  const replacePhoto = useCallback((next: OpeningPhoto) => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    if (outputUrl.current) URL.revokeObjectURL(outputUrl.current); outputUrl.current = null;
    photoUrl.current = next.url; setPhoto(next); setComposite(null);
  }, []);
  async function choosePhoto(file: File) {
    const version = ++photoVersion.current; detection.current?.cancel(); setDetecting(false); setLoading(true); setError(''); setNotice('');
    try {
      const next = await preparePhoto(file, 1600);
      if (version !== photoVersion.current) { URL.revokeObjectURL(next.url); return; }
      replacePhoto(next); createdAt.current = null; setPoints([]); setShowGuides(true); setSettings({ ...defaultPhotoSettings }); setBefore(false); setRecordId(null); setName(file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'My entrance');
    } catch (reason) { if (version === photoVersion.current) setError(reason instanceof Error ? reason.message : 'Could not load the photograph. Try another image.'); }
    finally { if (version === photoVersion.current) setLoading(false); }
  }
  useEffect(() => {
    if (!restored) return;
    const version = ++photoVersion.current; let active = true;
    void preparePhoto(new File([restored.photo], 'saved-entrance.png', { type: restored.photo.type || 'image/png' }), 1600).then((next) => {
      if (!active || version !== photoVersion.current) { URL.revokeObjectURL(next.url); return; }
      replacePhoto(next); createdAt.current = restored.createdAt; setPoints(restored.corners); setShowGuides(false); setSettings(restored.settings); setName(restored.name); setRecordId(restored.id); setBefore(false); setError(''); setNotice('Saved photo and settings reopened. XR placement is not restored.');
    }).catch(() => { if (active) setError('This saved photograph could not be decoded. Export or choose a new image.'); });
    return () => { active = false; };
  }, [restored, replacePhoto]);

  useEffect(() => {
    if (!enabled || !renderKey || !photo || !gate) return;
    let active = true; let task: ReturnType<typeof renderPhoto> | null = null;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          task = renderPhoto({ photo: { width: photo.width, height: photo.height, pixels: photo.pixels }, gate: imageRaster(gate), corners: points as Quad, settings });
          const pixels = await task.promise;
          const blob = await rasterBlob({ width: photo.width, height: photo.height, pixels });
          if (!active) return;
          if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
          outputUrl.current = URL.createObjectURL(blob); setComposite({ key: renderKey, blob, url: outputUrl.current });
        } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Photo composition failed.'); }
      })();
    }, 160);
    return () => { active = false; clearTimeout(timer); task?.cancel(); };
  }, [enabled, renderKey, photo, gate, points, settings]);

  async function detect() {
    if (!photo || detecting) return;
    const version = photoVersion.current; setShowGuides(true); setDetecting(true); setError(''); setNotice('');
    try {
      // Bounded detection input; photo composition keeps the larger image.
      const ratio = Math.min(1, 960 / Math.max(photo.width, photo.height));
      const width = Math.round(photo.width * ratio), height = Math.round(photo.height * ratio), pixels = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const from = (Math.min(photo.height - 1, Math.floor(y / ratio)) * photo.width + Math.min(photo.width - 1, Math.floor(x / ratio))) * 4;
        pixels.set(photo.pixels.subarray(from, from + 4), (y * width + x) * 4);
      }
      detection.current = runDetection({ width, height, pixels });
      const result = await detection.current.promise;
      if (version !== photoVersion.current) return;
      if (result.candidates[0]) { setPoints(result.candidates[0].corners); setNotice(`Suggested boundaries · heuristic ${result.candidates[0].score}/100, not a probability. Please inspect and correct all four corners. ${result.message}`); }
      else { setPoints([]); setNotice(result.message + ' No rectangle was substituted. Mark the four actual corners manually.'); }
    } catch (reason) { if (version === photoVersion.current) setError(reason instanceof Error ? reason.message : 'Detection failed. Mark the opening manually.'); }
    finally { if (version === photoVersion.current) { setDetecting(false); detection.current = null; } }
  }
  useEffect(() => { if (!enabled) detection.current?.cancel(); }, [enabled]);
  async function save() {
    if (!canExport || !photo?.blob || !gate || !composite || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(gate.asset.src); if (!response.ok) throw new Error('Could not read the selected gate for local saving.');
      const gateBlob = await response.blob(), now = Date.now(), id = recordId ?? crypto.randomUUID();
      await saveProject({ version: 1, id, name: name.trim(), createdAt: createdAt.current ?? now, updatedAt: now, photo: photo.blob, gate: gateBlob, composite: composite.blob, gateName: gate.asset.placeholder ? `Illustrative design — ${gate.asset.name}` : gate.asset.name, corners: points as Quad, settings, photoWidth: photo.width, photoHeight: photo.height });
      createdAt.current ??= now;
      setRecordId(id); setNotice('Saved on this device. Find it in Saved Previews. No cloud copy or XR anchor is stored.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save. Export the composite instead.'); }
    finally { setSaving(false); }
  }
  function adjust(next: PhotoSettings) { setSettings(next); setError(''); setNotice(''); }
  return <div className="photo-page">
    <div className="page-intro"><p className="eyebrow">A new perspective, from any device</p><h1>Photo Preview</h1><p>Bring a photograph of your entrance. Position a gate, refine its fit, and export the actual finished image.</p></div>
    <div className="photo-layout">
      <div className="photo-stage">
        {!photo ? <div className="photo-empty"><span className="large-number">01</span><h2>Begin with your entrance.</h2><p>A clear, nearly frontal photo works best. Your images stay in this browser.</p><label className="primary-button">Choose or take a photo<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" disabled={loading} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void choosePhoto(file); event.currentTarget.value = ''; }} /></label></div> : <>
          <div className="stage-toolbar"><span>{before ? 'Before · original photo' : ready ? 'After · composited photo' : 'Position your opening'}</span><div className="button-row"><button className="text-link" disabled={points.length !== 4} onClick={() => setShowGuides(!showGuides)}>{showGuides ? 'Hide guides' : 'Edit corners'}</button><button className="text-link" disabled={!canExport} onClick={() => setBefore(!before)}>{before ? 'Show after' : 'Show before'}</button></div></div>
          <OpeningEditor photo={photo} points={points} onChange={(next) => { setPoints(next); setError(''); setNotice('Manual correction. No automatic confidence is assigned.'); }} disabled={loading || detecting} hideGuides={!showGuides} {...(!before && ready && composite ? { displayUrl: composite.url } : {})} />
          {renderKey && !ready && !error && <p role="status" className="muted mt-3">Rendering perspective preview…</p>}
          {validation && <p className="muted mt-3">{validation}</p>}
        </>}
        {loading && <p role="status">Preparing your photograph…</p>}
        {detecting && <div role="status">Finding geometric suggestions… <button className="text-link" onClick={() => detection.current?.cancel()}>Cancel detection</button></div>}
        {error && <p role="alert" className="form-error">{error}</p>}
        {notice && <p role="status" className="form-notice">{notice}</p>}
      </div>
      <aside className="photo-settings" aria-label="Photo preview controls">
        <p className="eyebrow">Make it yours</p><h2>The details matter.</h2>
        <label className="field-label">Entrance photograph<input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" disabled={loading || detecting} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void choosePhoto(file); event.currentTarget.value = ''; }} /></label>
        <div className="button-row"><button className="secondary-button" disabled={!photo || detecting} onClick={() => { void detect(); }}>Suggest opening</button><button className="text-link" disabled={!photo || detecting} onClick={() => { setPoints([]); setShowGuides(true); setNotice('Tap top-left, top-right, bottom-right, then bottom-left.'); }}>Mark manually</button></div>
        <label className="field-label">Gate design<select value={gateCatalogue.some((asset) => asset.src === gate?.asset.src) ? gate?.asset.src : ''} disabled={gateLoading} onChange={(event) => { const asset = gateCatalogue.find((item) => item.src === event.currentTarget.value); if (asset) void load(undefined, asset); }}><option value="">Your uploaded gate</option>{gateCatalogue.map((asset) => <option key={asset.id} value={asset.src}>{asset.name}</option>)}</select></label>
        <label className="field-label">Or upload your gate<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void load(file); event.currentTarget.value = ''; }} /></label>
        {gateError && <p role="alert" className="form-error">{gateError}</p>}
        <label className="field-label">Image fitting<select value={settings.fitting} onChange={(event) => adjust({ ...settings, fitting: event.currentTarget.value as PhotoSettings['fitting'] })}><option value="crop">Crop to opening</option><option value="fit">Fit whole image</option><option value="proportional">Proportional to width</option></select></label>
        <div className="two-fields">{(['width', 'height'] as const).map((key) => <label className="field-label" key={key}>Layout {key} (m)<input type="number" min="0.2" max={key === 'width' ? 20 : 10} step="0.01" value={settings[key]} onChange={(event) => { const n = event.currentTarget.valueAsNumber; if (n >= 0.2 && n <= (key === 'width' ? 20 : 10)) adjust({ ...settings, [key]: n }); }} /></label>)}</div>
        {([['scale', 'Gate size', 0.25, 1.5, 0.01], ['x', 'Horizontal position', -0.5, 0.5, 0.005], ['y', 'Vertical position', -0.5, 0.5, 0.005], ['opacity', 'Opacity', 0, 1, 0.01], ['brightness', 'Brightness', 0.25, 2, 0.01]] as const).map(([key, label, min, max, step]) => <label className="field-label" key={key}>{label} <span>{settings[key].toFixed(2)}</span><input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(event) => adjust({ ...settings, [key]: event.currentTarget.valueAsNumber })} /></label>)}
        <p className="fine-print">Layout dimensions set the photo fitting ratio; defaults are estimates. This is a 2D perspective study, not a depth measurement. PNG/WebP alpha is retained; JPG stays opaque. No foreground removal or occlusion is invented.</p>
        <label className="field-label">Preview name<input maxLength={120} value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
        <button className="primary-button full-width" disabled={!canExport || saving || !name.trim()} onClick={() => { void save(); }}>{saving ? 'Saving…' : recordId ? 'Update saved preview' : 'Save on this device'}</button>
        {canExport && composite ? <a className="secondary-button full-width" href={composite.url} download={`${name.trim() || 'entrance'}-gate-preview.png`}>Export composited image</a> : <button className="secondary-button full-width" disabled>Export composited image</button>}
        <button className="text-link" disabled={!photo} onClick={() => { setSettings({ ...defaultPhotoSettings }); setBefore(false); setError(''); }}>Reset photo adjustments</button>
        <p className="fine-print">Save and export always use the After composite, even while comparing the original photo.</p>
      </aside>
    </div>
  </div>;
}
