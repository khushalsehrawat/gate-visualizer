import { useEffect, useRef, useState } from 'react';
import type { GateCalibration } from '../geometry/calibration';
import { gateLayout } from '../geometry/fitting';
import type { GateAsset } from '../gates/assets';
import { gateCatalogue } from '../gates/assets';
import type { GateImage } from '../gates/loadImage';
import type { GatePresentation } from '../gates/presentation';

interface Props {
  gate: GateImage | null; calibration: GateCalibration;
  value: GatePresentation; onChange: (value: GatePresentation) => void;
  onCatalogue: (asset: GateAsset) => void; loading: boolean; locked: boolean; canCompare: boolean;
}
export function PresentationControls({ gate, calibration, value, onChange, onCatalogue, loading, locked, canCompare }: Props) {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [download, setDownload] = useState<string | null>(null);
  const exportUrl = useRef<string | null>(null); const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; if (exportUrl.current) URL.revokeObjectURL(exportUrl.current); }, []);
  const knownAsset = gateCatalogue.some((asset) => asset.src === gate?.asset.src);
  const layout = gate ? gateLayout(calibration.width, calibration.height, gate.asset.widthPixels, gate.asset.heightPixels, value.fitting, calibration.scale) : null;
  async function exportPng() {
    if (!gate) return;
    const version = ++generation.current; setExporting(true); setMessage('Preparing a gate-only image; this does not capture the AR camera.');
    try {
      const { exportGateOnly } = await import('../preview/exportGate');
      const blob = await exportGateOnly(gate, calibration, value);
      if (version !== generation.current) return;
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current);
      exportUrl.current = URL.createObjectURL(blob); setDownload(exportUrl.current);
      setMessage(`Gate-only front-elevation PNG ready for ${gate.asset.name}. No real environment, perspective or XR passthrough is included. This file reflects the settings at export time; export again after edits or catalogue changes.`);
    } catch (reason) { if (version === generation.current) setMessage(reason instanceof Error ? reason.message : 'PNG export failed. Use Android screenshot controls if supported.'); }
    finally { if (version === generation.current) setExporting(false); }
  }
  return <details className="gate-controls">
    <summary className="min-h-11 cursor-pointer py-3 font-semibold">Fitting, appearance & preview</summary>
    <div className="calibration-body space-y-4">
      <label className="block text-sm font-semibold">Gate catalogue
        <select className="mt-1 w-full rounded border bg-white p-2" value={knownAsset ? gate!.asset.src : ''} disabled={loading} onChange={(event) => { const asset = gateCatalogue.find((item) => item.src === event.currentTarget.value); if (asset) onCatalogue(asset); }}>
          {!knownAsset && <option value="">{gate ? 'Current local upload' : 'Loading selected gate…'}</option>}
          {gateCatalogue.map((asset) => <option key={asset.id} value={asset.src}>{asset.name}</option>)}
        </select>
      </label>
      <p className="text-xs">All included catalogue designs are original flat placeholders. Switching preserves anchors, calibration, appearance and lock; decoding failure retains the previous gate.</p>
      <label className="block text-sm font-semibold">Fitting mode
        <select className="mt-1 w-full rounded border bg-white p-2" value={value.fitting} disabled={locked} onChange={(event) => onChange({ ...value, fitting: event.currentTarget.value as GatePresentation['fitting'] })}>
          <option value="fit">Fit — entire image inside opening</option><option value="crop">Crop — fill opening, trim image</option><option value="proportional">Proportional — width-driven natural height</option>
        </select>
      </label>
      {layout && <p className="text-sm">Rendered plane: {layout.width.toFixed(3)} × {layout.height.toFixed(3)} m. {value.fitting === 'crop' ? 'Plane matches the scaled opening. Crop is horizontally centered and bottom-aligned; top/sides may be trimmed.' : value.fitting === 'fit' ? 'No cropping or stretching; image may leave room at the top or sides.' : 'Width matches the scaled opening; height follows image aspect and can exceed measured height.'} Transparent artwork margins still count.</p>}
      {([
        ['brightness', 'Brightness', 0.25, 2, 0.01], ['contrast', 'Contrast', 0.25, 2.5, 0.01],
        ['opacity', 'Opacity', 0, 1, 0.01], ['exposure', 'Manual lighting exposure (EV)', -2, 2, 0.05],
      ] as const).map(([key, label, min, max, step]) => <label className="block text-sm" key={key}>{label}: {value[key].toFixed(2)}
        <input className="block min-h-11 w-full" type="range" min={min} max={max} step={step} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.currentTarget.valueAsNumber })} />
      </label>)}
      <p className="text-xs">Manual image adjustments only. No measured scene lighting, physically accurate shadows, gate thickness or 3D geometry is added. Foreground occlusion is OFF: verified real depth/segmentation data is unavailable.</p>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={value.smoothing} onChange={(event) => onChange({ ...value, smoothing: event.currentTarget.checked })} />Smooth small world-anchor corrections (80 ms)</label>
      <p className="text-xs">Smoothing never follows the camera. Recovery, new placement and manual adjustments reset the filter. Large native pose jumps snap; use Reposition if alignment is no longer correct.</p>
      <button className="action" disabled={!canCompare} onClick={() => onChange({ ...value, before: !value.before })}>{value.before ? 'Show after — gate visible' : 'Show before — hide gate'}</button>
      <p className="text-xs">Live AR comparison toggles only the world gate; placement and tracking remain intact. Requires a placed gate and native DOM overlay. Tracking loss always hides the gate.</p>
      <button className="action" disabled={!gate || exporting || value.before} onClick={() => { void exportPng(); }}>Export gate-only PNG</button>
      <p className="text-xs">XR environment screenshots are unavailable in this app: passthrough capture is unverified. For the live view, use Android’s system screenshot/recording controls if Chrome permits them, then inspect whether the environment was included. The PNG export contains only the fitted 2D artwork, not an AR screenshot.</p>
      {message && <p role="status" className="text-sm">{message}</p>}
      {download && <a className="inline-block min-h-11 py-3 text-teal-800 underline" href={download} download="gate-only-no-environment.png">Download prepared gate-only PNG</a>}
    </div>
  </details>;
}
