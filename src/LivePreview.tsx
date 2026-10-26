import { useEffect, useState } from 'react';
import { checking, detectBrowserCapability } from './capabilities/detect';
import type { CapabilityResult } from './capabilities/detect';
import { GatePreview } from './preview/GatePreview';
import { CapabilityPanel } from './ui/CapabilityPanel';
import { useXRSession } from './xr/useXRSession';
import { useGateLibrary } from './gates/GateProvider';
import { GateControls } from './ui/GateControls';
import { OpeningDetection } from './detection/OpeningDetection';
import type { ConfirmedOpening } from './detection/types';
import { PresentationControls } from './ui/PresentationControls';
import { LiveGateSetup } from './ui/LiveGateSetup';

export default function LivePreview({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [result, setResult] = useState<CapabilityResult>(checking);
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState<ConfirmedOpening | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { gate, loading, error, load } = useGateLibrary();
  const { status, hostRef, overlayRef, mode, setMode, calibration, configure, presentation, present, horizontal, start, place, reset, reposition, lock, exit } = useXRSession(gate);
  const busy = ['requesting', 'starting', 'running', 'ending'].includes(status.session);
  useEffect(() => { onActiveChange?.(busy); return () => { onActiveChange?.(false); }; }, [busy, onActiveChange]);
  useEffect(() => {
    let active = true;
    void detectBrowserCapability().then((next) => { if (active) setResult(next); });
    return () => { active = false; };
  }, [attempt]);
  function retry() { setResult(checking); setAttempt((value) => value + 1); }
  function confirmOpening(next: ConfirmedOpening | null) {
    setOpening(next);
    if (next) {
      setMode('gate');
      configure({ ...calibration, width: next.width, height: next.height, scale: 1, x: 0, z: 0, elevation: 0, yaw: 0 });
    }
  }
  return <div className="live-workspace">
    <div className="page-intro"><p className="eyebrow">Your gate. Your live camera.</p><h1>Start Live Preview</h1><p>Upload your gate below, open the AR camera, then select the entrance’s left and right pillar bases. Your gate is placed in the real environment while you move the phone.</p></div>
    <LiveGateSetup gate={gate} loading={loading} error={error} busy={busy} onImage={load} calibration={calibration} onCalibration={configure} />
    <ol className="live-steps" aria-label="Live AR steps"><li><b>01</b><span>Upload your gate<small>Use a transparent PNG and enter measured size.</small></span></li><li><b>02</b><span>Start AR<small>Allow Chrome to open the immersive camera.</small></span></li><li><b>03</b><span>Place at your entrance<small>Scan the ground. Capture the left base, then the right.</small></span></li></ol>
    <div className="grid items-start gap-5 md:grid-cols-2"><CapabilityPanel result={result} onRetry={retry} onStart={start} busy={busy || photoBusy || loading || (mode === 'gate' && !gate)} /><GatePreview gate={gate} /></div>
    {result.status === 'insecure' && <section className="live-connection-help" aria-labelledby="phone-connection-title"><h2 id="phone-connection-title">Your phone needs a secure connection for live AR.</h2><p>A Wi-Fi link beginning <code>http://192.168…</code> can show this website, but Chrome will not enable tracked AR there. Use trusted HTTPS, or connect your Android phone by USB and forward port 5173 in desktop Chrome’s <code>chrome://inspect/#devices</code>.</p><p>With USB forwarding enabled, open <strong>http://localhost:5173/#/live</strong> on the phone. The localhost exception works only when the phone’s port is actually forwarded to this computer.</p><a className="text-link" href="https://developers.google.com/ar/develop/webxr/requirements" target="_blank" rel="noopener noreferrer">Android live AR connection instructions ↗</a></section>}
    <details className="optional-photo-tools"><summary>Optional: prepare opening boundaries from a photo</summary><p className="fine-print">You do not need a house photo to use the live camera. This separate tool is optional and does not create a world anchor.</p><OpeningDetection arActive={busy} locked={status.locked} onBusy={setPhotoBusy} onConfirm={confirmOpening} /></details>
    <div ref={hostRef} className="xr-canvas-host" />
    <section ref={overlayRef} className="xr-controls panel mt-5 p-5" aria-labelledby="debug-title">
      <div className="xr-control-card">
      <p className="eyebrow">Your live preview</p><h2 id="debug-title">Calibration & session</h2>
      <p className="my-3 text-sm" role="status">{status.message}</p>
      <p className="text-sm font-semibold">Tracking: {status.tracking}</p>
      {mode === 'gate' && status.session === 'running' && status.placement === 'Not placed' && <p className="live-placement-prompt">{status.hitTest.startsWith('Unavailable') ? 'Surface scanning is unavailable. Tap Place gate (manual) for approximate placement 1.5 m ahead, then lower and align the gate using the live controls.' : status.calibration === 'Capture right pillar base' ? 'Left base saved. Aim the teal ring at the RIGHT inner pillar base, then tap Capture right base.' : 'Move slowly until the teal ring appears on the entrance ground. Aim at the LEFT inner pillar base and tap Capture left base.'}</p>}
      {mode === 'gate' && status.session === 'running' && status.placement !== 'Not placed' && <p className="live-placement-prompt">Your gate is in the live scene. Move sideways to check alignment, adjust if needed, then Lock Placement.</p>}
      {opening && <p className="text-sm">Photo boundaries user-confirmed ({opening.source}). Measured envelope {opening.width.toFixed(2)} × {opening.height.toFixed(2)} m was applied. Match the photo’s BL and BR to the physical LEFT and RIGHT pillar bases with XR hits. Photo pixels have not supplied a world pose or depth.</p>}
      <label className="block text-sm font-semibold">AR mode <select className="ml-2 rounded-lg border bg-white p-2" value={mode} disabled={busy} onChange={(event) => setMode(event.currentTarget.value as 'gate' | 'marker')}><option value="gate">2D gate calibration</option><option value="marker">Stage 2 diagnostic marker</option></select></label>
      {mode === 'gate' && <GateControls config={calibration} onChange={configure} gate={gate} loading={loading} error={error} onImage={load} locked={status.locked} baseline={status.baseline} onHorizontal={horizontal} canNudge={status.session === 'running' && status.placement !== 'Not placed'} fitting={presentation.fitting} />}
      {mode === 'gate' && <PresentationControls gate={gate} calibration={calibration} value={presentation} onChange={present} onCatalogue={(asset) => { void load(undefined, asset); }} loading={loading} locked={status.locked} canCompare={status.session === 'running' && status.placement !== 'Not placed'} />}
      {mode === 'gate' && <p className="text-sm font-semibold">{status.calibration} · {status.locked ? 'Locked' : 'Unlocked'}</p>}
      <details className="session-diagnostics"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Session diagnostics</summary><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div><dt>Capability</dt><dd data-testid="debug-capability">{result.status}</dd></div>
        <div><dt>XR session</dt><dd>{status.session}</dd></div>
        <div><dt>Tracking</dt><dd>{status.tracking}</dd></div>
        <div><dt>Reference space</dt><dd>{status.referenceSpace}</dd></div>
        <div><dt>Hit test</dt><dd>{status.hitTest}</dd></div>
        <div><dt>Anchors</dt><dd>{status.anchors}</dd></div>
        <div><dt>DOM overlay</dt><dd>{status.overlay}</dd></div>
        <div><dt>Placement</dt><dd>{status.placement}</dd></div>
        <div><dt>XR camera frames</dt><dd>{status.cameraFrames}</dd></div>
        <div><dt>Foreground occlusion</dt><dd>Off — real depth/segmentation unverified</dd></div>
        <div><dt>XR screenshot</dt><dd>Passthrough capture unavailable; gate-only PNG export or Android controls</dd></div>
        <div><dt>Preview</dt><dd>{presentation.before ? 'Before: gate hidden' : 'After: gate visible when tracked'}</dd></div>
        {status.profile && <><div><dt>Last XR frame sample</dt><dd>{status.profile.fps.toFixed(1)} fps · p95 {status.profile.p95IntervalMs.toFixed(1)} ms</dd></div><div><dt>App CPU / render calls</dt><dd>{status.profile.cpuMs.toFixed(2)} ms · {status.profile.draws ?? 'unavailable'} calls</dd></div><div><dt>Renderer resource counts</dt><dd>{status.profile.geometries ?? '?'} geometries · {status.profile.textures ?? '?'} textures</dd></div></>}
      </dl></details>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="action" disabled={status.session !== 'running' || status.placement !== 'Not placed' || (mode === 'gate' && !gate)} onClick={place}>{mode === 'gate' ? (status.hitTest.startsWith('Unavailable') ? 'Place gate (manual)' : status.calibration === 'Capture right pillar base' ? 'Capture right base' : 'Capture left base') : 'Place marker'}</button>
        <button className="action" disabled={status.session !== 'running'} onClick={reset}>Reset</button>
        {mode === 'gate' && <><button className="action" disabled={status.session !== 'running' || status.locked} onClick={reposition}>Reposition</button><button className="action" disabled={status.session !== 'running' || status.placement === 'Not placed'} onClick={lock}>{status.locked ? 'Unlock Placement' : 'Lock Placement'}</button></>}
        <button className="action" disabled={!['starting', 'running'].includes(status.session)} onClick={exit}>Exit AR</button>
      </div>
      <p className="mt-3 text-sm">Aim using the center of the XR view. Without DOM overlay, gate mode still captures two bases with native taps, but fine controls/replacement/locking require exiting and a browser supporting DOM overlay. Diagnostic mode retains tap-to-place/reset. Chrome's native XR exit always remains available. No hit testing: approximate placement is 1.5 m ahead at viewer height; manually lower and align it.</p>
      </div>
    </section>
    <footer className="mt-6 text-sm text-slate-600">Target: ARCore-compatible Android 12+ · Trusted HTTPS · WebXR-enabled browser</footer>
  </div>;
}
