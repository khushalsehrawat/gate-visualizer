import type { XRStatus } from '../xr/session';

interface Props {
  status: XRStatus; hasGate: boolean;
  onCapture: () => void; onUndo: () => void;
}

export function PlacementGuide({ status, hasGate, onCapture, onUndo }: Props) {
  if (status.session !== 'running' || status.placement !== 'Not placed') return null;
  const right = status.calibration === 'Capture right pillar base';
  const ready = status.surfaceReady && status.gateReady && status.hitTest === 'Surface found' && status.tracking === 'Tracking';
  const unavailable = status.hitTest.startsWith('Unavailable');
  return <div className="placement-guide" aria-label="Entrance bottom point capture">
    <ol className="placement-progress" aria-label="Placement progress">
      <li aria-current={!right ? 'step' : undefined}>{right ? '✓' : '1'} Left point</li>
      <li aria-current={right ? 'step' : undefined}>2 Right point</li>
    </ol>
    <p>{unavailable ? 'Surface scanning is unavailable. Choose manual placement below to align approximately.' : right
      ? 'Left point saved (amber ring). Aim at the RIGHT edge of your opening.'
      : 'Aim the teal ring at the LEFT edge of your opening. Pillars are not required.'}</p>
    <p className="capture-readiness" role="status">{unavailable ? 'Use “No surface? Place manually” below.' : ready ? `Surface ready — capture ${right ? 'right' : 'left'} bottom` : 'Waiting for a tracked surface at the centre. Scan slowly; capture is disabled until ready.'}</p>
    <div className="placement-actions">
      <button className="action capture-bottom" disabled={!ready || !hasGate} onClick={onCapture} aria-label={right ? 'Capture right base' : 'Capture left base'}>Set {right ? 'RIGHT' : 'LEFT'} point</button>
      {right && <button className="action" onClick={onUndo}>Retake left point</button>}
    </div>
    <p className="fine-print">Choose both points at the same ground level. Gate width fits automatically between them.</p>
  </div>;
}
