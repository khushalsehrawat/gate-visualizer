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
import { PlacementGuide } from './ui/PlacementGuide';

export default function LivePreview({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [result, setResult] = useState<CapabilityResult>(checking);
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState<ConfirmedOpening | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { gate, loading, error, load } = useGateLibrary();
  const { status, hostRef, overlayRef, mode, setMode, calibration, configure, presentation, present, horizontal, start, place, undoLeft, placeManual, reset, reposition, lock, exit } = useXRSession(gate);
  const [manualReview, setManualReview] = useState(false);
  const busy = ['requesting', 'starting', 'running', 'ending'].includes(status.session);
  const needsAttention = status.session === 'error' || /distinct RIGHT|25 cm|Placement paused|No surface at|reference space reset|Could not|WebGL context lost/.test(status.message);
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
    <div hidden={busy}>
    <div className="page-intro simple-intro"><h1>Live Camera AR</h1><p>Choose a gate. Open the camera. Place it at your entrance.</p></div>
    <LiveGateSetup gate={gate} loading={loading} error={error} busy={busy} onImage={load} calibration={calibration} onCalibration={configure} />
    <CapabilityPanel result={result} onRetry={retry} onStart={start} busy={busy || photoBusy || loading || (mode === 'gate' && !gate)} />
    <details className="simple-options"><summary>See selected gate</summary><GatePreview gate={gate} /></details>
    {result.status === 'insecure' && <section className="live-connection-help" aria-labelledby="phone-connection-title"><h2 id="phone-connection-title">Your phone needs a secure connection for live AR.</h2><p>A Wi-Fi link beginning <code>http://192.168…</code> can show this website, but Chrome will not enable tracked AR there. Use trusted HTTPS, or connect your Android phone by USB and forward port 5173 in desktop Chrome’s <code>chrome://inspect/#devices</code>.</p><p>With USB forwarding enabled, open <strong>http://localhost:5173/#/live</strong> on the phone. The localhost exception works only when the phone’s port is actually forwarded to this computer.</p><a className="text-link" href="https://developers.google.com/ar/develop/webxr/requirements" target="_blank" rel="noopener noreferrer">Android live AR connection instructions ↗</a></section>}
    <details className="optional-photo-tools"><summary>Auto-detect opening points & confirm all four</summary><p className="fine-print">Optional photo preparation. Confirmed corners still need real AR base points for world placement.</p><OpeningDetection arActive={busy} locked={status.locked} onBusy={setPhotoBusy} onConfirm={confirmOpening} /></details>
    </div>
    <div ref={hostRef} className="xr-canvas-host" />
    <section ref={overlayRef} className="xr-controls panel mt-5 p-5" aria-labelledby="debug-title">
      <div className="xr-control-card" hidden={!busy && status.session !== 'error' && status.session !== 'ended'}>
      <h2 id="debug-title">Your live preview</h2>
      {mode === 'gate' && <PlacementGuide status={status} hasGate={!!gate} onCapture={place} onUndo={undoLeft} />}
      <p className="text-sm font-semibold">{status.session === 'running' ? `Tracking: ${status.tracking}` : status.session === 'error' ? 'Camera could not start' : ''}</p>
      {needsAttention && <p role="alert" className="form-error">{status.message}</p>}
      {mode === 'gate' && status.session === 'running' && status.placement !== 'Not placed' && <p className="live-placement-prompt">Check the fit, then lock your gate.</p>}
      <div className="simple-camera-actions">
        {mode === 'gate' && status.session === 'running' && status.placement === 'Not placed' && <button className="action" disabled={!gate} onClick={() => setManualReview(true)}>No surface? Place manually</button>}
        {mode === 'marker' && <button className="action" disabled={status.session !== 'running' || status.placement !== 'Not placed'} onClick={place}>Place marker</button>}
        {mode === 'gate' && status.session === 'running' && status.placement !== 'Not placed' && <><button className="action" disabled={status.locked} onClick={reposition}>Reposition</button><button className="action" onClick={lock}>{status.locked ? 'Unlock Placement' : 'Lock Placement'}</button></>}
        <button className="action" disabled={!['starting', 'running'].includes(status.session)} onClick={exit}>Exit AR</button>
      </div>
      <details className="simple-options xr-more"><summary>Adjust gate & more</summary>
      <details className="camera-clarity-help"><summary>Camera blurry or scanning slowly?</summary><p>Chrome/ARCore controls immersive camera focus and resolution; this page cannot force autofocus or sharpen the passthrough image. Point at a well-lit textured surface 1–2 m away and pause movement. If it stays blurry, Exit AR, close other camera apps and retry Start AR. Placement must be recaptured after restarting.</p><p>For four-point detection, exit AR and take a sharp entrance photo using the photo tool above. Never confirm points you cannot see clearly.</p><button className="action" disabled={status.session !== 'running'} onClick={exit}>Exit AR to retry camera</button></details>
      {opening && <p className="text-sm">Photo boundaries user-confirmed ({opening.source}). Measured envelope {opening.width.toFixed(2)} × {opening.height.toFixed(2)} m was applied. Match the photo’s BL and BR to the physical LEFT and RIGHT pillar bases with XR hits. Photo pixels have not supplied a world pose or depth.</p>}
      <label className="block text-sm font-semibold">AR mode <select className="ml-2 rounded-lg border bg-white p-2" value={mode} disabled={busy} onChange={(event) => setMode(event.currentTarget.value as 'gate' | 'marker')}><option value="gate">2D gate calibration</option><option value="marker">Stage 2 diagnostic marker</option></select></label>
      {mode === 'gate' && <GateControls config={calibration} onChange={configure} gate={gate} loading={loading} error={error} onImage={load} locked={status.locked} baseline={status.baseline} onHorizontal={horizontal} canNudge={status.session === 'running' && status.placement !== 'Not placed'} fitting={presentation.fitting} />}
      {mode === 'gate' && <PresentationControls gate={gate} calibration={calibration} value={presentation} onChange={present} onCatalogue={(asset) => { void load(undefined, asset); }} loading={loading} locked={status.locked} canCompare={status.session === 'running' && status.placement !== 'Not placed'} />}
      {mode === 'gate' && <p className="text-sm font-semibold">{status.calibration} · {status.locked ? 'Locked' : 'Unlocked'}</p>}
      <details className="session-diagnostics"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Session diagnostics</summary><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        {!needsAttention && <div><dt>Session message</dt><dd>{status.message}</dd></div>}
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
      <button className="action" disabled={status.session !== 'running'} onClick={reset}>Reset</button>
      </details>
      {manualReview && status.session === 'running' && status.placement === 'Not placed' && <div className="live-placement-prompt" role="group" aria-label="Confirm approximate placement">
        <p>This places the gate once, 1.5 m ahead at camera height, using real XR tracking. It does not measure the entrance depth. You must lower and align it using the calibration controls, then check from the side. Your photo points do not supply a world position.</p>
        <button className="action" disabled={!gate} onClick={() => { setManualReview(false); placeManual(); }}>Confirm approximate placement</button>{' '}
        <button className="action" onClick={() => setManualReview(false)}>Keep scanning</button>
      </div>}
      <details className="simple-options"><summary>Camera help</summary><p>Aim using the centre ring. Without DOM overlay, capture bases with native taps and use Chrome's native XR exit. Manual placement is approximate and needs height/depth alignment.</p></details>
      </div>
    </section>
    <footer className="mt-6 text-sm text-slate-600">Target: ARCore-compatible Android 12+ · Trusted HTTPS · WebXR-enabled browser. Physical-device validation: UNVERIFIED. This testing label is separate from the live tracking state.</footer>
  </div>;
}
