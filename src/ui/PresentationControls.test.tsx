import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresentationControls } from './PresentationControls';
import { defaultCalibration } from '../geometry/calibration';
import { defaultPresentation } from '../gates/presentation';
import { sampleGate } from '../gates/assets';
import { exportGateOnly } from '../preview/exportGate';
vi.mock('../preview/exportGate', () => ({ exportGateOnly: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); });
const gate = () => ({ image: document.createElement('img'), asset: sampleGate });
describe('presentation, catalogue and supported capture controls', () => {
  it('keeps appearance/catalogue/compare available on a locked placement while protecting fit', () => {
    const onChange = vi.fn(), onCatalogue = vi.fn();
    render(<PresentationControls gate={gate()} calibration={defaultCalibration} value={defaultPresentation} onChange={onChange} onCatalogue={onCatalogue} loading={false} locked canCompare />);
    fireEvent.click(screen.getByText('Fitting, appearance & preview'));
    expect(screen.getByLabelText('Fitting mode')).toBeDisabled(); expect(screen.getByLabelText('Gate catalogue')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Gate catalogue'), { target: { value: '/gates/gate-02.png' } });
    expect(onCatalogue).toHaveBeenCalledWith(expect.objectContaining({ id: 'gate-02' }));
    fireEvent.change(screen.getByLabelText(/Brightness:/), { target: { value: '1.25' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultPresentation, brightness: 1.25 });
    fireEvent.click(screen.getByRole('button', { name: 'Show before — hide gate' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultPresentation, before: true });
    expect(screen.getByText(/Foreground occlusion is OFF/)).toBeInTheDocument();
  });
  it('offers only a labeled gate-only export and revokes prepared download URLs', async () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:gate-export'); static revokeObjectURL = revoke; });
    vi.mocked(exportGateOnly).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    const { unmount } = render(<PresentationControls gate={gate()} calibration={defaultCalibration} value={defaultPresentation} onChange={vi.fn()} onCatalogue={vi.fn()} loading={false} locked={false} canCompare={false} />);
    fireEvent.click(screen.getByText('Fitting, appearance & preview'));
    expect(screen.getByRole('button', { name: 'Show before — hide gate' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Export gate-only PNG' }));
    const download = await screen.findByRole('link', { name: 'Download prepared gate-only PNG' });
    expect(download).toHaveAttribute('href', 'blob:gate-export');
    expect(screen.getByText(/No real environment, perspective or XR passthrough is included/)).toBeInTheDocument();
    unmount(); expect(revoke).toHaveBeenCalledWith('blob:gate-export');
  });
});
