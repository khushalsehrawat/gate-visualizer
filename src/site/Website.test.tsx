import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
vi.mock('../photo/PhotoPage', () => ({ default: () => <div><h1>Photo Preview</h1><p>Photo workspace</p></div> }));
beforeEach(() => { window.location.hash = '/home'; Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true }); Object.defineProperty(navigator, 'xr', { configurable: true, value: undefined }); });
async function navigate(route: string) { await act(async () => { window.location.hash = `/${route}`; window.dispatchEvent(new Event('hashchange')); }); }
describe('customer website journey integration', () => {
  it('keeps separate real-entrance and picture-camera buttons visible outside the mobile menu', async () => {
    render(<App />);
    const picker = within(screen.getByRole('navigation', { name: 'Choose your camera preview' }));
    expect(picker.getByRole('link', { name: /Live Camera AR/ })).toHaveAttribute('href', '#/live');
    expect(picker.getByRole('link', { name: /Camera on Entrance Picture/ })).toHaveAttribute('href', '#/picture');
    await navigate('live');
    expect(picker.getByRole('link', { name: /Live Camera AR/ })).toHaveAttribute('aria-current', 'page');
    await navigate('picture');
    await screen.findByRole('heading', { name: 'Live Picture Preview' });
    expect(picker.getByRole('link', { name: /Camera on Entrance Picture/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Start picture camera' })).toBeEnabled();
  });
  it('prioritizes photo fallback, navigates catalogue categories, upload, help and unknown routes', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: "See Your Gate Before It's Installed." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Skip to content' })); expect(screen.getByRole('main')).toHaveFocus();
    await screen.findByText(/Photo Preview is your starting point/);
    expect(screen.getByRole('link', { name: /Create a Photo Preview/ })).toHaveAttribute('href', '#/photo');
    await navigate('catalogue'); expect(screen.getAllByRole('article')).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Laser Cut' })); expect(screen.getAllByRole('article')).toHaveLength(1);
    await navigate('upload'); expect(screen.getByRole('heading', { name: 'Bring your own gate.' })).toBeInTheDocument();
    await navigate('photo'); expect(screen.getByRole('heading', { name: 'Photo Preview' })).toBeInTheDocument();
    await navigate('picture'); expect(await screen.findByRole('heading', { name: 'Live Picture Preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start picture camera' })).toBeInTheDocument();
    await navigate('help'); expect(screen.getByRole('heading', { name: 'Compatibility & Help' })).toBeInTheDocument();
    await navigate('unknown'); expect(screen.getByRole('link', { name: 'Return home' })).toBeInTheDocument();
  });
  it('prioritizes Live Preview only after native support is reported, without starting XR', async () => {
    const requestSession = vi.fn(); Object.defineProperty(navigator, 'xr', { configurable: true, value: { isSessionSupported: vi.fn().mockResolvedValue(true), requestSession } });
    render(<App />); await waitFor(() => expect(screen.getByText('Live AR is available on this device')).toBeInTheDocument());
    expect(within(screen.getByRole('navigation', { name: 'Choose your camera preview' })).getByRole('link', { name: /Live Camera AR/ })).toHaveAttribute('href', '#/live'); expect(requestSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' })); expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  });
});
