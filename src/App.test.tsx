import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LivePreview from './LivePreview';
import { GateProvider } from './gates/GateProvider';
import { mockReadyImage } from './test/mockReadyImage';
function App() { return <GateProvider><LivePreview /></GateProvider>; }

describe('Stage 2 testing screen', () => {
  beforeEach(() => {
    mockReadyImage();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'xr', { configurable: true, value: undefined });
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('shows checking then unavailable with AR disabled', async () => {
    render(<App />);
    expect(screen.getByTestId('debug-capability')).toHaveTextContent('checking');
    await waitFor(() => expect(screen.getByTestId('debug-capability')).toHaveTextContent('unavailable'));
    expect(screen.getByRole('button', { name: 'Start AR' })).toBeDisabled();
  });
  it.each([true, false])('launches only after a gesture when support=%s', async (supported) => {
    const requestSession = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'xr', { configurable: true, value: { isSessionSupported: vi.fn().mockResolvedValue(supported), requestSession } });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('debug-capability')).toHaveTextContent(supported ? /^supported$/ : /^unsupported$/));
    expect(requestSession).not.toHaveBeenCalled();
    if (supported) {
      await waitFor(() => expect(screen.getByRole('button', { name: 'Start AR' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Start AR' }));
      expect(requestSession).toHaveBeenCalledTimes(1);
      await screen.findByText(/AR permission was denied/);
    } else {
      expect(screen.getByRole('button', { name: 'Start AR' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Start AR' }));
      expect(requestSession).not.toHaveBeenCalled();
    }
  });
  it('can retry a failed support check', async () => {
    const isSessionSupported = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce(true);
    Object.defineProperty(navigator, 'xr', { configurable: true, value: { isSessionSupported } });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('debug-capability')).toHaveTextContent('error'));
    fireEvent.click(screen.getByRole('button', { name: 'Recheck device' }));
    await waitFor(() => expect(screen.getByTestId('debug-capability')).toHaveTextContent(/^supported$/));
  });
  it('explains insecure contexts', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('debug-capability')).toHaveTextContent('insecure'));
    expect(screen.getByText(/trusted HTTPS to check/)).toBeInTheDocument();
  });
});
