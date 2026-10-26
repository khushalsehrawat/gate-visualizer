import { describe, expect, it, vi } from 'vitest';
import { detectCapability } from './detect';

describe('WebXR capability detection', () => {
  it('requires a secure context without querying XR', async () => {
    const isSessionSupported = vi.fn();
    expect((await detectCapability({ secureContext: false, xr: { isSessionSupported } })).status).toBe('insecure');
    expect(isSessionSupported).not.toHaveBeenCalled();
  });
  it('handles a missing WebXR API', async () => {
    expect((await detectCapability({ secureContext: true })).status).toBe('unavailable');
  });
  it.each([true, false])('queries real immersive-ar support: %s', async (supported) => {
    const isSessionSupported = vi.fn().mockResolvedValue(supported);
    expect((await detectCapability({ secureContext: true, xr: { isSessionSupported } })).status).toBe(supported ? 'supported' : 'unsupported');
    expect(isSessionSupported).toHaveBeenCalledExactlyOnceWith('immersive-ar');
  });
  it('handles rejected checks without exposing browser errors', async () => {
    const isSessionSupported = vi.fn().mockRejectedValue(new Error('denied'));
    expect((await detectCapability({ secureContext: true, xr: { isSessionSupported } })).status).toBe('error');
  });
});
