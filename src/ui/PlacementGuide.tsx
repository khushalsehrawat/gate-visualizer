import type { XRStatus } from '../xr/session';

interface Props {
  status: XRStatus; hasGate: boolean;
  onCapture: () => void; onUndo: () => void;
}

export function PlacementGuide({ status, hasGate, onCapture, onUndo }: Props) {
  if (status.session !== 'running' || status.placement !== 'Not placed') return null;
  const right = status.calibration === 'Capture right pillar base';
  const ready = status.hitTest === 'Surface found' && status.tracking.startsWith('Tracking');
  const unavailable = status.hitTest.startsWith('Unavailable');
  return <div className="placement-guide" aria-label="Entrance bottom point capture">
    <ol className="placement-progress" aria-label="Placement progress">
      <li aria-current={!right ? 'step' : undefined}>{right ? '✓' : '1'} Left bottom</li>
      <li aria-current={right ? 'step' : undefined}>2 Right bottom</li>
    </ol>
    <p>{unavailable ? 'Surface scanning is unavailable. Choose manual placement below to align approximately.' : right
      ? 'Left bottom saved (amber ring). Aim at the RIGHT pillar bottom.'
      : 'Aim the teal ring at the LEFT pillar bottom.'}</p>
    <p className="capture-readiness" role="status">{unavailable ? 'Use “No surface? Place manually” below.' : ready ? `Surface ready — capture ${right ? 'right' : 'left'} bottom` : 'Waiting for a tracked surface at the centre. Scan slowly; capture is disabled until ready.'}</p>
    <div className="placement-actions">
      <button className="action capture-bottom" disabled={!ready || !hasGate} onClick={onCapture} aria-label={right ? 'Capture right base' : 'Capture left base'}>Capture {right ? 'RIGHT' : 'LEFT'} bottom</button>
      {right && <button className="action" onClick={onUndo}>Retake left bottom</button>}
    </div>
    <p className="fine-print">Move the phone to aim the ring, then capture.</p>
  </div>;
}
