import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveGateSetup } from './LiveGateSetup';
import { defaultCalibration } from '../geometry/calibration';
describe('upload-first live AR setup', () => {
  it('sends the chosen gate directly to the shared live image loader', () => {
    const onImage = vi.fn().mockResolvedValue(undefined), onCalibration = vi.fn();
    render(<LiveGateSetup gate={null} loading={false} error="" busy={false} onImage={onImage} calibration={defaultCalibration} onCalibration={onCalibration} />);
    const file = new File(['gate'], 'my-gate.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Gate image for Live AR'), { target: { files: [file] } });
    expect(onImage).toHaveBeenCalledWith(file);
    const width = screen.getByLabelText('Opening width for AR (m)');
    fireEvent.change(width, { target: { value: '3.5' } }); fireEvent.blur(width);
    expect(onCalibration).toHaveBeenCalledWith({ ...defaultCalibration, width: 3.5 });
  });
  it('blocks pre-session upload/size changes while native AR is active', () => {
    render(<LiveGateSetup gate={null} loading={false} error="" busy onImage={vi.fn()} calibration={defaultCalibration} onCalibration={vi.fn()} />);
    expect(screen.getByLabelText('Gate image for Live AR')).toBeDisabled();
    expect(screen.getByLabelText('Opening height for AR (m)')).toBeDisabled();
  });
});
