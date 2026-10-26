import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defaultCalibration } from '../geometry/calibration';
import { GateControls } from './GateControls';

describe('gate calibration controls', () => {
  it('labels defaults as estimates and sends metric adjustments', () => {
    const onChange = vi.fn();
    render(<GateControls config={defaultCalibration} onChange={onChange} gate={null} loading={false} error="" onImage={vi.fn()} locked={false} baseline={null} />);
    fireEvent.click(screen.getByText('Gate calibration & image'));
    expect(screen.getByText(/Defaults 3.00 × 1.80 m are ESTIMATES/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Entrance width (m)'), { target: { value: '3.5' } });
    fireEvent.blur(screen.getByLabelText('Entrance width (m)'));
    expect(onChange).toHaveBeenCalledWith({ ...defaultCalibration, width: 3.5 });
  });
  it('disables transformations while allowing replacement on a locked gate', () => {
    const onImage = vi.fn().mockResolvedValue(undefined);
    render(<GateControls config={defaultCalibration} onChange={vi.fn()} gate={null} loading={false} error="" onImage={onImage} locked baseline={3} />);
    fireEvent.click(screen.getByText('Gate calibration & image'));
    expect(screen.getByLabelText('Entrance width (m)')).toBeDisabled();
    const upload = screen.getByLabelText(/Replace gate image/);
    expect(upload).toBeEnabled();
    const file = new File(['image'], 'gate.webp', { type: 'image/webp' });
    fireEvent.change(upload, { target: { files: [file] } });
    expect(onImage).toHaveBeenCalledWith(file);
  });
});
