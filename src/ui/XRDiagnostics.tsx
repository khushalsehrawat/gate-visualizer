import type { XRStatus } from '../xr/session';
import { xrResourceCounts } from '../xr/resources';
export function XRDiagnostics({ status }: { status: XRStatus }) {
  if (!import.meta.env.DEV) return null;
  const p = status.profile;
  const counts = p ? null : xrResourceCounts();
  return <details className="session-diagnostics"><summary>Developer performance</summary>
    <p>Actual XR callbacks, not camera latency or physical-device verification. JS time includes render submission, not GPU completion or React commits.</p>
    {p ? <dl className="xr-diagnostic-grid">
      <div><dt>XR interval / FPS</dt><dd>{p.intervalMs.toFixed(1)} ms / {p.fps.toFixed(1)}</dd></div>
      <div><dt>p95 interval</dt><dd>{p.p95IntervalMs.toFixed(1)} ms</dd></div>
      <div><dt>JS processing</dt><dd>{p.cpuMs.toFixed(2)} ms</dd></div>
      <div><dt>Hit success</dt><dd>{p.hitSuccessRate === null ? 'Not querying' : `${(p.hitSuccessRate * 100).toFixed(0)}%`}</dd></div>
      <div><dt>Reticle updates</dt><dd>{p.reticleHz.toFixed(1)} /s</dd></div>
      <div><dt>Sessions / hit sources</dt><dd>{p.activeSessions} / {p.activeHitSources}</dd></div>
      <div><dt>Draw calls / textures</dt><dd>{p.draws ?? '—'} / {p.textures ?? '—'}</dd></div>
    </dl> : <><p>Waiting for a one-second sample.</p><p>Active app sessions / hit sources: {counts?.sessions} / {counts?.hitSources}</p></>}
    <p>{status.referenceSpace} · {status.hitTest} · {status.anchors}</p>
  </details>;
}
