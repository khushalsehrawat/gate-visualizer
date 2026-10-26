import type { CapabilityResult } from '../capabilities/detect';

export function CapabilityPanel({ result, onRetry, onStart, busy }: { result: CapabilityResult; onRetry: () => void; onStart: () => void; busy: boolean }) {
  return <section className="panel p-5" aria-labelledby="capability-title">
    <p className="eyebrow">02 · Open the live camera</p><h2 id="capability-title">See your gate in real AR.</h2>
    <div role="status" aria-live="polite" className="my-5 rounded-xl bg-slate-100 p-4">
      <p className="mb-2 font-semibold capitalize">{result.status}</p><p className="text-sm text-slate-600">{result.message}</p>
    </div>
    <button className="action w-full" aria-label="Start AR" disabled={result.status !== 'supported' || busy} onClick={onStart} aria-describedby="launch-reason">Start AR — open live camera</button>
    <p id="launch-reason" className="mt-3 text-sm text-slate-600">Chrome opens the real immersive AR camera. Scan and select both pillar bases to see your gate stay in world space. Requires an ARCore-compatible Android phone and trusted HTTPS or USB-forwarded localhost.</p>
    <button className="mt-5 min-h-11 rounded-lg px-3 font-semibold text-teal-800 underline underline-offset-4 disabled:opacity-50" disabled={result.status === 'checking' || busy} onClick={onRetry}>Recheck device</button>
  </section>;
}
