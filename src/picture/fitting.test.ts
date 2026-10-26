import { describe, expect, it } from 'vitest';
import { defaultPictureFit, pictureLayout, regionAspect } from './fitting';
import { validateQuad } from '../detection/geometry';
describe('gate fitting to user-selected regions', () => {
  it('fills the complete confirmed region by default and allows explicit size/offset edits', () => {
    expect(pictureLayout({ ...defaultPictureFit, mode: 'fill' }, 1600, 900)).toMatchObject({ left: 0, top: 0, width: 1, height: 1, repeatX: 1, repeatY: 1 });
    expect(pictureLayout({ ...defaultPictureFit, mode: 'fill', width: .8, height: .5, x: .1, y: -.1 }, 1600, 900)).toMatchObject({ width: .8, height: .5, top: .4 });
  });
  it.each([[2000, 500], [500, 2000], [1000, 1000]])('auto-fits a %s by %s image wholly inside an arbitrary selected area', (w, h) => {
    const q = [{ x: .1, y: .2 }, { x: .9, y: .2 }, { x: .9, y: .8 }, { x: .1, y: .8 }] as import('../detection/geometry').Quad;
    const aspect = regionAspect(q, 400, 300), layout = pictureLayout({ ...defaultPictureFit, aspect }, w, h);
    expect(layout.left).toBeGreaterThanOrEqual(0); expect(layout.top).toBeGreaterThanOrEqual(0);
    expect(layout.left + layout.width).toBeLessThanOrEqual(1); expect(layout.top + layout.height).toBeLessThanOrEqual(1);
    expect(layout.width * aspect / layout.height).toBeCloseTo(w / h);
    expect(aspect).toBeCloseTo(320 / 180);
  });
  it('fits without stretching and crops to fill while retaining natural proportions', () => {
    const fit = pictureLayout({ ...defaultPictureFit, aspect: 1, mode: 'fit' }, 2000, 1000);
    expect(fit.width).toBe(1); expect(fit.height).toBe(.5); expect(fit.top).toBe(.5);
    const crop = pictureLayout({ ...defaultPictureFit, aspect: 1, mode: 'crop' }, 2000, 1000);
    expect(crop.width).toBe(1); expect(crop.height).toBe(1); expect(crop.repeatX).toBe(.5); expect(crop.offsetX).toBe(.25);
  });
  it('accepts manually selected near-full-screen regions without relaxing automatic opening heuristics', () => {
    const q = [{ x: .005, y: .005 }, { x: .995, y: .005 }, { x: .995, y: .995 }, { x: .005, y: .995 }];
    expect(validateQuad(q)).not.toBeNull(); expect(validateQuad(q, 1, 1, true)).toBeNull();
    expect(validateQuad([q[0]!, q[2]!, q[1]!, q[3]!], 1, 1, true)).not.toBeNull();
    expect(() => pictureLayout({ ...defaultPictureFit, aspect: 0 }, 100, 100)).toThrow();
  });
});
