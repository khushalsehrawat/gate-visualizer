import { validCalibration } from '../geometry/calibration';
import { gateLayout } from '../geometry/fitting';
import type { FittingMode } from '../geometry/fitting';
import type { GateCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';

interface Props {
  config: GateCalibration; onChange: (config: GateCalibration) => void;
  gate: GateImage | null; loading: boolean; error: string;
  onImage: (file?: File) => Promise<void>; locked: boolean; baseline: number | null;
  onHorizontal?: (step: number) => void; canNudge?: boolean;
  fitting?: FittingMode;
}

const fields: { key: keyof GateCalibration; label: string; min: number; max: number; step: number }[] = [
  { key: 'width', label: 'Entrance width (m)', min: 0.2, max: 20, step: 0.01 },
  { key: 'height', label: 'Gate height (m)', min: 0.2, max: 10, step: 0.01 },
  { key: 'x', label: 'World X offset (m)', min: -20, max: 20, step: 0.01 },
  { key: 'z', label: 'World Z offset / depth (m)', min: -20, max: 20, step: 0.01 },
  { key: 'elevation', label: 'Base height offset (m)', min: -10, max: 10, step: 0.01 },
  { key: 'yaw', label: 'Vertical-axis rotation (°)', min: -360, max: 360, step: 0.1 },
  { key: 'scale', label: 'Uniform scale multiplier', min: 0.1, max: 3, step: 0.01 },
];

export function GateControls({ config, onChange, gate, loading, error, onImage, locked, baseline, onHorizontal, canNudge = false, fitting = 'fit' }: Props) {
  const fitted = gate ? gateLayout(config.width, config.height, gate.asset.widthPixels, gate.asset.heightPixels, fitting, config.scale) : null;
  return <details className="gate-controls">
    <summary className="min-h-11 cursor-pointer py-3 font-semibold">Gate calibration & image</summary>
    <div className="calibration-body space-y-4">
      <p className="text-sm">Defaults 3.00 × 1.80 m are ESTIMATES. Replace them with tape measurements. Capture LEFT then RIGHT pillar bases using real XR hits; world up establishes vertical. Confirm depth from the side, then lock. No image-corner depth inference.</p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, min, max, step }) => <label className="text-xs font-semibold" key={key}>{label}
          <input key={`${key}-${config[key]}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-base" type="number" inputMode="decimal" min={min} max={max} step={step} defaultValue={config[key]} disabled={locked} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} onBlur={(event) => {
            const next = { ...config, [key]: event.currentTarget.valueAsNumber };
            if (validCalibration(next)) onChange(next);
            else event.currentTarget.value = String(config[key]);
          }} />
        </label>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="action" disabled={locked || !canNudge || !onHorizontal} onClick={() => onHorizontal?.(-0.01)}>Along gate ← 1 cm</button>
        <button className="action" disabled={locked || !canNudge || !onHorizontal} onClick={() => onHorizontal?.(0.01)}>Along gate 1 cm →</button>
        <button className="action" disabled={locked} onClick={() => onChange({ ...config, elevation: config.elevation + 0.01 })}>Raise 1 cm</button>
        <button className="action" disabled={locked} onClick={() => onChange({ ...config, elevation: config.elevation - 0.01 })}>Lower 1 cm</button>
      </div>
      <p className="text-xs">Edits apply on Enter or when leaving the field; out-of-range values revert. X/Z follow the fixed XR reference axes, not the phone. Try a +0.05 m change to learn each direction, then reverse if needed. Height is world up. Yaw rotates around the gate's bottom center. Scale 1 preserves the measured envelope.</p>
      {fitted && <p className="text-sm">Rendered gate plane: <strong>{fitted.width.toFixed(3)} × {fitted.height.toFixed(3)} m</strong> ({fitting}). Select Fit/Crop/Proportional under Fitting, appearance & preview. Transparent image padding counts toward these dimensions; use tightly cropped artwork.</p>}
      {baseline !== null && <p className="text-sm">XR pillar span: {baseline.toFixed(2)} m (approximate, not a tape measurement). {Math.abs(baseline - config.width) > Math.max(0.2, config.width * 0.1) ? 'Span differs from entered width: check measurements and recapture both bases if needed.' : 'Verify alignment at both pillars and from the side.'}</p>}
      <label className="block text-sm font-semibold">Replace gate image (PNG / JPG / WebP)
        <input className="mt-2 block w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void onImage(file); event.currentTarget.value = ''; }} />
      </label>
      <button className="action" disabled={loading} onClick={() => { void onImage(); }}>Load gate-01 sample</button>
      <p className="text-xs">Up to 10 MB and 4096 px per side. Uploads stay on this device. JPG is opaque; only existing PNG/WebP alpha reveals the environment. Replacement keeps placement, dimensions and lock.</p>
      {loading && <p role="status">Loading image…</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  </details>;
}
