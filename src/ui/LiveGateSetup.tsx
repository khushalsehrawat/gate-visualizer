import type { GateImage } from '../gates/loadImage';
import type { GateCalibration } from '../geometry/calibration';

interface Props {
  gate: GateImage | null; loading: boolean; error: string; busy: boolean;
  onImage: (file?: File) => Promise<void>;
  calibration: GateCalibration; onCalibration: (value: GateCalibration) => void;
}
export function LiveGateSetup({ gate, loading, error, busy, onImage, calibration, onCalibration }: Props) {
  return <section className="live-gate-setup" aria-labelledby="live-upload-title">
    <div><p className="eyebrow">01 · Your own design</p><h2 id="live-upload-title">Upload your gate for the live camera.</h2><p>Select a transparent PNG for the spaces between the bars. Your image will be used by the real AR renderer, not a photograph preview.</p></div>
    <div className="live-upload-controls">
      <label className="field-label">Gate image for Live AR
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || loading} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void onImage(file); event.currentTarget.value = ''; }} />
      </label>
      {loading ? <p role="status" className="muted">Preparing the selected gate…</p> : gate && <p className="muted">{gate.asset.placeholder ? 'Example design selected' : 'Your gate is ready'}: <strong>{gate.asset.name}</strong></p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="two-fields">{(['width', 'height'] as const).map((key) => <label className="field-label" key={key}>Opening {key} for AR (m)
        <input type="number" key={`${key}-${calibration[key]}`} defaultValue={calibration[key]} min="0.2" max={key === 'width' ? 20 : 10} step="0.01" disabled={busy} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} onBlur={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value) && value >= 0.2 && value <= (key === 'width' ? 20 : 10)) onCalibration({ ...calibration, [key]: value });
          else event.currentTarget.value = String(calibration[key]);
        }} />
      </label>)}</div>
      <p className="fine-print">Default 3 × 1.8 m dimensions are estimates. Enter tape measurements. PNG/JPG/WebP up to 10 MB and 4096 px; JPG backgrounds remain opaque. Upload before starting AR; replacement is also available inside the live controls.</p>
    </div>
  </section>;
}
