import { useState } from 'react';
import type { PointerEvent } from 'react';
import { cornerLabels } from './geometry';
import type { Point } from './geometry';
import type { OpeningPhoto } from './photo';

interface Props { photo: OpeningPhoto; points: Point[]; onChange: (points: Point[]) => void; disabled: boolean; displayUrl?: string; hideGuides?: boolean }
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function OpeningEditor({ photo, points, onChange, disabled, displayUrl, hideGuides = false }: Props) {
  const [selected, setSelected] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const active = points[selected];
  function pointer(event: PointerEvent<HTMLDivElement>, index: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
    const changed = [...points]; changed[index] = next; onChange(changed);
  }
  function nudge(dx: number, dy: number) {
    if (!active) return;
    const next = [...points]; next[selected] = { x: clamp(active.x + dx / photo.width), y: clamp(active.y + dy / photo.height) }; onChange(next);
  }
  return <div className="space-y-3">
    {!hideGuides && <p className="text-sm">{points.length < 4 ? `Manual marking: tap ${cornerLabels[points.length]} next. No default rectangle is supplied.` : 'Drag the 44 px handles onto the inner opening boundaries. Use the magnifier and nudge buttons for precision.'}</p>}
    <div className="opening-editor" style={{ aspectRatio: `${photo.width}/${photo.height}`, touchAction: disabled || hideGuides ? 'auto' : 'none' }}
      onPointerDown={(event) => {
        if (disabled || hideGuides) return;
        const target = (event.target as Element).closest('[data-corner]');
        const index = target ? Number(target.getAttribute('data-corner')) : points.length < 4 ? points.length : -1;
        if (index < 0) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setSelected(index); setDrag(index);
        if (!target) pointer(event, index);
      }}
      onPointerMove={(event) => { if (!disabled && !hideGuides && drag !== null) pointer(event, drag); }}
      onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onLostPointerCapture={() => setDrag(null)}>
      <img src={displayUrl ?? photo.url} alt={displayUrl ? 'Photo preview of the gate composited onto your entrance' : 'Entrance photo for 2D boundary review, separate from AR'} className="block h-full w-full" draggable={false} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        {!hideGuides && points.length === 4 && <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="#14b8a61c" stroke="#00ffdc" strokeWidth="0.005" />}
      </svg>
      {!hideGuides && points.map((point, i) => <button key={i} type="button" data-corner={i} aria-label={`Select ${cornerLabels[i]} corner`} disabled={disabled} className="corner-handle" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} onClick={() => setSelected(i)}>{['TL', 'TR', 'BR', 'BL'][i]}</button>)}
    </div>
    {!hideGuides && !!points.length && <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm">Adjust corner <select className="rounded border bg-white p-2" value={Math.min(selected, points.length - 1)} disabled={disabled} onChange={(event) => setSelected(Number(event.currentTarget.value))}>{points.map((_, i) => <option value={i} key={i}>{cornerLabels[i]}</option>)}</select></label>
      {active && <div role="img" aria-label={`${cornerLabels[selected]} magnifier, 3 times the analysis scale`} className="opening-magnifier" style={{ backgroundImage: `url("${photo.url}")`, backgroundSize: `${photo.width * 3}px ${photo.height * 3}px`, backgroundPosition: `${70 - active.x * photo.width * 3}px ${70 - active.y * photo.height * 3}px` }}><span /></div>}
      <div className="flex flex-wrap gap-2">
        <button className="action" disabled={disabled || !active} onClick={() => nudge(-5, 0)}>← 5 px</button>
        <button className="action" disabled={disabled || !active} onClick={() => nudge(5, 0)}>5 px →</button>
        <button className="action" disabled={disabled || !active} onClick={() => nudge(0, -5)}>↑ 5 px</button>
        <button className="action" disabled={disabled || !active} onClick={() => nudge(0, 5)}>5 px ↓</button>
      </div>
    </div>}
  </div>;
}
