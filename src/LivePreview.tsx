import { useEffect, useRef, useState } from 'react';
import { checking, detectBrowserCapability } from './capabilities/detect';
import type { CapabilityResult } from './capabilities/detect';
import { CapabilityPanel } from './ui/CapabilityPanel';
import { useXRSession } from './xr/useXRSession';
import { useGateLibrary } from './gates/GateProvider';
import { GateControls } from './ui/GateControls';
import { OpeningDetection } from './detection/OpeningDetection';
import type { ConfirmedOpening } from './detection/types';
import { PresentationControls } from './ui/PresentationControls';
import { PlacementGuide } from './ui/PlacementGuide';
import { XRDiagnostics } from './ui/XRDiagnostics';

export default function LivePreview({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [result, setResult] = useState<CapabilityResult>(checking);
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState<ConfirmedOpening | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [fineTune, setFineTune] = useState(false);
  const [manualReview, setManualReview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { gate, loading, error, load } = useGateLibrary();
  const { status, hostRef, overlayRef, mode, setMode, placementMethod = 'single-point', chooseMethod, calibration, configure, presentation, present, horizontal, start, place, undoLeft, placeManual, reset, reposition, lock, exit } = useXRSession(gate);
  const busy = ['requesting', 'starting', 'running', 'ending'].includes(status.session);
  const placed = status.placement !== 'Not placed';
  const ready = status.session === 'running' && status.surfaceReady && status.tracking === 'Tracking' && !!gate && status.gateReady && !loading;
  const trackingLabel = placed && status.tracking === 'Tracking' && status.anchors !== 'Anchor pose unavailable; marker hidden' ? 'Gate Placed' : ready ? 'Ready to Place' : 'Finding Surface';
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
      chooseMethod?.('two-point');
      configure({ ...calibration, width: next.width, height: next.height, scale: 1, x: 0, z: 0, elevation: 0, yaw: 0 });
    }
  }
  return <div className="live-workspace">
    <output hidden data-testid="debug-capability">{result.status}</output>
    {!busy && <div>
      <div className="page-intro simple-intro"><h1>Live Camera AR</h1><p>Open the camera. Choose a gate. Aim and place.</p></div>
      <CapabilityPanel result={result} onRetry={retry} onStart={start} busy={busy || photoBusy} />
      {result.status === 'insecure' && <p className="form-error">Open this site over trusted HTTPS on your phone. A computer's HTTP Wi-Fi address cannot start tracked AR.</p>}
    </div>}
    <div ref={hostRef} className="xr-canvas-host" />
    <section ref={overlayRef} className="xr-controls panel mt-5 p-5 xr-customer-controls" aria-label="Live gate controls">
      {busy && <header className="xr-overlay-header"><span role="status">{trackingLabel}</span><button className="action" aria-label="Exit AR" onClick={exit}>Close</button></header>}
      <div className="xr-control-card">
        {needsAttention && <p role="alert" className="form-error">{status.message}</p>}
        {busy && !placed && <p className="xr-guidance">{!gate ? 'Select your gate to begin.' : loading || !status.gateReady ? 'Preparing your gate…' : !ready ? 'Aim at the ground in the middle of the entrance. Move slowly over a textured, well-lit area.' : 'Align the preview, then tap Place Gate. Use Fine Tune for measured pillar alignment.'}</p>}
        {busy && placed && <p className="xr-guidance">{trackingLabel === 'Gate Placed' ? 'Walk around to preview your gate.' : 'Tracking interrupted. Move slowly to recover; the gate stays hidden until its pose is valid.'}</p>}
        {busy && <div className="xr-primary-actions">
          <button className="action" disabled={loading} onClick={() => fileInput.current?.click()}>{placed ? 'Change Gate' : 'Select Gate'}</button>
          {!placed && mode === 'gate' && placementMethod === 'single-point' && <button className="action xr-place-button" disabled={!ready} onClick={place}>Place Gate</button>}
          {placed && <button className="action" onClick={reposition}>Reset</button>}
          {mode === 'marker' && !placed && <button className="action" disabled={!ready} onClick={place}>Place marker</button>}
        </div>}
        {busy && mode === 'gate' && placementMethod === 'two-point' && <PlacementGuide status={status} hasGate={!!gate} onCapture={place} onUndo={undoLeft} />}
        {busy && !placed && <label className="xr-size-control">Size<input aria-label="Size" type="range" min="0.1" max="3" step="0.01" value={calibration.scale} onChange={(event) => configure({ ...calibration, scale: event.currentTarget.valueAsNumber })} /></label>}
        {placed && (loading || (!!gate && !status.gateReady)) && <p role="status">Preparing gate…</p>}
        {error && <p role="alert" className="form-error">{error}</p>}
        {!placed && status.session === 'running' && !ready && <button className="text-link" onClick={() => setManualReview(true)}>No surface? Place manually</button>}
        {manualReview && !placed && status.session === 'running' && <div className="live-placement-prompt" role="group" aria-label="Confirm approximate placement"><p>Place once 1.5 m ahead at camera height. This does not measure the entrance depth. Align height and direction in Fine Tune.</p><button className="action" disabled={!gate || loading || status.tracking !== 'Tracking'} onClick={() => { setManualReview(false); placeManual(); }}>Confirm approximate placement</button>{' '}<button className="action" onClick={() => setManualReview(false)}>Keep scanning</button></div>}
        <details className="simple-options xr-more" open={fineTune} onToggle={(event) => setFineTune(event.currentTarget.open)}><summary>Fine Tune</summary>
          {fineTune && <>
            <p className="fine-print">Size defaults are estimates. Enter measurements for accurate fitting. A ground point supplies position; it does not detect your complete entrance.</p>
            {placed && <button className="action" onClick={lock}>{status.locked ? 'Unlock adjustments' : 'Lock adjustments'}</button>}
            {!placed && <label className="field-label">Placement method<select value={placementMethod} onChange={(event) => chooseMethod?.(event.currentTarget.value as 'single-point' | 'two-point')}><option value="single-point">Simple — entrance centre</option><option value="two-point">Precise — left and right pillar bases</option></select></label>}
            <div className="button-row"><button className="action" disabled={status.locked || (!ready && !placed)} onClick={() => horizontal(-.05)}>Move left</button><button className="action" disabled={status.locked || (!ready && !placed)} onClick={() => horizontal(.05)}>Move right</button><button className="action" disabled={status.locked} onClick={() => configure({ ...calibration, yaw: Math.max(-360, calibration.yaw - 5) })}>Rotate left</button><button className="action" disabled={status.locked} onClick={() => configure({ ...calibration, yaw: Math.min(360, calibration.yaw + 5) })}>Rotate right</button></div>
            <GateControls config={calibration} onChange={configure} gate={gate} loading={loading} error="" onImage={load} locked={status.locked} baseline={status.baseline} onHorizontal={horizontal} canNudge={ready || placed} fitting={presentation.fitting} />
            <PresentationControls gate={gate} calibration={calibration} value={presentation} onChange={present} onCatalogue={(asset) => { void load(undefined, asset); }} loading={loading} locked={status.locked} canCompare={status.session === 'running' && placed} />
            {opening && <p className="fine-print">Photo boundaries user-confirmed ({opening.source}). Measured envelope {opening.width.toFixed(2)} × {opening.height.toFixed(2)} m was applied. Photo pixels have not supplied a world pose or depth. Use precise pillar alignment at the same entrance.</p>}
            {!busy && <details className="optional-photo-tools"><summary>Auto-detect opening points & confirm all four</summary><OpeningDetection arActive={false} locked={status.locked} onBusy={setPhotoBusy} onConfirm={confirmOpening} /></details>}
            {!busy && <label className="field-label">AR mode<select value={mode} onChange={(event) => setMode(event.currentTarget.value as 'gate' | 'marker')}><option value="gate">Gate</option><option value="marker">Diagnostic marker</option></select></label>}
            <button className="text-link" onClick={reset}>Reset all settings</button>
            <p className="fine-print">No surface: manual placement is approximate and requires positional tracking. Without DOM overlay use native XR taps; Chrome's native exit remains available. Physical-device behavior is UNVERIFIED.</p>
            <XRDiagnostics status={status} />
          </>}
        </details>
      </div>
      <input ref={fileInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Gate image for Live AR" disabled={loading} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void load(file); event.currentTarget.value = ''; }} />
    </section>
  </div>;
}
