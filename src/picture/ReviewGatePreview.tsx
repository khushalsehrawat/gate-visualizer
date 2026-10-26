import { useEffect, useRef, useState } from 'react';
import type { GateImage } from '../gates/loadImage';
import type { OpeningPhoto } from '../detection/photo';
import type { Quad } from '../detection/geometry';
import type { PictureFit } from './fitting';
import type { createPictureOverlay } from './overlay';

export function ReviewGatePreview({ gate, photo, corners, fitting, opacity }: { gate: GateImage; photo: OpeningPhoto; corners: Quad; fitting: PictureFit; opacity: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createPictureOverlay> | null>(null);
  const [ready, setReady] = useState(0), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void import('./overlay').then(({ createPictureOverlay }) => {
      if (!active || !canvas.current) return;
      renderer.current = createPictureOverlay(canvas.current, photo.width, photo.height, gate);
      setReady((value) => value + 1);
    }).catch(() => { if (active) setError('Could not render the fitted preview. Try Photo Preview or another browser.'); });
    return () => { active = false; renderer.current?.dispose(); renderer.current = null; };
  }, [gate, photo]);
  useEffect(() => {
    if (!renderer.current) return;
    try { renderer.current.show(corners, opacity, fitting); }
    catch { renderer.current.hide(); }
  }, [corners, fitting, opacity, ready]);
  return <figure className="region-fit-preview">
    <div className="picture-camera"><img src={photo.url} alt="Frozen entrance frame with your gate fitted into the selected area" /><canvas key={`${photo.url}:${gate.asset.src}`} ref={canvas} hidden aria-label="Gate fitted to selected area on the frozen frame" /></div>
    <figcaption className="fine-print">Fitted preview on a frozen frame — not live tracking. Review the area and confirm all four points below.</figcaption>
    {error && <p role="alert">{error}</p>}
  </figure>;
}
