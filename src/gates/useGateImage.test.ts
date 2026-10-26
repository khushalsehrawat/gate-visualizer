import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGateImage } from './useGateImage';
import { gateCatalogue } from './assets';

const images: FakeImage[] = [];
class FakeImage {
  naturalWidth = 640; naturalHeight = 360; src = '';
  onload: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor() { images.push(this); }
}
const revoke = vi.fn();
let nextUrl = 0;
beforeEach(() => {
  images.length = 0; nextUrl = 0; revoke.mockClear();
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return `blob:test-${++nextUrl}`; }
    static revokeObjectURL = revoke;
  });
});
afterEach(() => { vi.unstubAllGlobals(); });
const png = (name: string) => new File(['PNG'], name, { type: 'image/png' });

describe('local gate image ownership and replacement', () => {
  it('loads gate-01 initially and retains the previous image if a replacement fails', async () => {
    const { result, unmount } = renderHook(useGateImage);
    expect(images[0]!.src).toBe('/gates/gate-01.png');
    await act(async () => { images[0]!.onload!(); });
    const original = result.current.gate;
    let pending!: Promise<void>;
    act(() => { pending = result.current.load(png('broken.png')); });
    await act(async () => { images[1]!.onerror!(); await pending; });
    expect(result.current.gate).toBe(original);
    expect(result.current.error).toMatch(/previous gate is retained/);
    expect(revoke).toHaveBeenCalledWith('blob:test-1');
    unmount();
  });
  it('ignores stale decoded uploads and revokes stale/current object URLs', async () => {
    const { result, unmount } = renderHook(useGateImage);
    await act(async () => { images[0]!.onload!(); });
    let first!: Promise<void>, second!: Promise<void>;
    act(() => { first = result.current.load(png('first.png')); second = result.current.load(png('second.png')); });
    await act(async () => { images[2]!.onload!(); await second; images[1]!.onload!(); await first; });
    expect(result.current.gate?.asset.name).toBe('second.png');
    expect(revoke).toHaveBeenCalledWith('blob:test-1');
    unmount(); expect(revoke).toHaveBeenCalledWith('blob:test-2');
  });
  it('revokes an in-flight URL on unmount before decoding completes', async () => {
    const { result, unmount } = renderHook(useGateImage);
    let pending!: Promise<void>;
    act(() => { pending = result.current.load(png('pending.png')); });
    unmount(); expect(revoke).toHaveBeenCalledWith('blob:test-1');
    await act(async () => { images[1]!.onload!(); await pending; });
  });
  it('switches catalogue assets without URLs for local files and rejects stale completions', async () => {
    const { result, unmount } = renderHook(useGateImage);
    await act(async () => { images[0]!.onload!(); });
    let first!: Promise<void>, second!: Promise<void>;
    act(() => { first = result.current.load(undefined, gateCatalogue[1]); second = result.current.load(undefined, gateCatalogue[2]); });
    expect(images[1]!.src).toBe('/gates/gate-02.png'); expect(images[2]!.src).toBe('/gates/gate-03.png');
    await act(async () => { images[2]!.naturalWidth = 480; images[2]!.onload!(); await second; images[1]!.onload!(); await first; });
    expect(result.current.gate?.asset.src).toBe('/gates/gate-03.png');
    expect(result.current.gate?.asset.placeholder).toBe(true);
    expect(revoke).not.toHaveBeenCalled(); unmount();
  });
});
