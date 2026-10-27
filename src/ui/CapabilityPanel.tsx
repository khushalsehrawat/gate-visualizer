import type { CapabilityResult } from '../capabilities/detect';

export function CapabilityPanel({ result, onRetry, onStart, busy }: { result: CapabilityResult; onRetry: () => void; onStart: () => void; busy: boolean }) {
  return <section className="panel p-5" aria-labelledby="capability-title">
    <h2 id="capability-title" className="sr-only">Open your live camera</h2>
    <button className="action w-full" aria-label="Start AR" disabled={result.status !== 'supported' || busy} onClick={onStart} aria-describedby="launch-reason">Start Live Preview</button>
    <p id="launch-reason" className="my-3 text-sm">Select a gate, then set left and right points. The gate width fits automatically.</p>
    {result.status !== 'supported' && <p role="status" className="my-3 text-sm">{result.message}</p>}
    <details className="simple-options"><summary>Device information</summary>
    <div role="status" aria-live="polite" className="my-5 rounded-xl bg-slate-100 p-4">
      <p className="mb-2 font-semibold capitalize">{result.status}</p>{result.status === 'supported' && <p className="text-sm text-slate-600">{result.message}</p>}
    </div>
    <button className="mt-5 min-h-11 rounded-lg px-3 font-semibold text-teal-800 underline underline-offset-4 disabled:opacity-50" disabled={result.status === 'checking' || busy} onClick={onRetry}>Recheck device</button>
    </details>
  </section>;
}
