import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlacementGuide } from './PlacementGuide';
import { initialXRStatus } from '../xr/session';

const status = { ...initialXRStatus, session: 'running' as const, tracking: 'Tracking (device UNVERIFIED)', hitTest: 'Surface found' };
describe('guided entrance bottom capture', () => {
  it('enables capture only for a real tracked surface and a loaded gate', () => {
    const capture = vi.fn(), undo = vi.fn();
    const { rerender } = render(<PlacementGuide status={{ ...status, hitTest: 'Scanning; no surface yet' }} hasGate onCapture={capture} onUndo={undo} />);
    expect(screen.getByRole('button', { name: 'Capture left base' })).toBeDisabled();
    rerender(<PlacementGuide status={status} hasGate onCapture={capture} onUndo={undo} />);
    fireEvent.click(screen.getByRole('button', { name: 'Capture left base' })); expect(capture).toHaveBeenCalledOnce();
    rerender(<PlacementGuide status={{ ...status, tracking: 'Lost; move slowly to recover' }} hasGate onCapture={capture} onUndo={undo} />);
    expect(screen.getByRole('button', { name: 'Capture left base' })).toBeDisabled();
    rerender(<PlacementGuide status={status} hasGate={false} onCapture={capture} onUndo={undo} />);
    expect(screen.getByRole('button', { name: 'Capture left base' })).toBeDisabled();
  });
  it('explains the saved left point and allows retaking it before right capture', () => {
    const capture = vi.fn(), undo = vi.fn();
    render(<PlacementGuide status={{ ...status, calibration: 'Capture right pillar base' }} hasGate onCapture={capture} onUndo={undo} />);
    expect(screen.getByText(/Left bottom saved \(amber ring\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retake left bottom' })); expect(undo).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Capture right base' })); expect(capture).toHaveBeenCalledOnce();
  });
});
