async function requestContinuousFocus(track: MediaStreamTrack | undefined) {
  if (!track) return;
  try {
    const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[] };
    if (capabilities?.focusMode?.includes('continuous')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet & { focusMode: string }] });
    }
  } catch { /* Optional camera control: preserve the functioning stream if unsupported. */ }
}

export class PictureCamera {
  private generation = 0;
  private stream: MediaStream | null = null;
  async start(video: HTMLVideoElement, onEnded?: () => void) {
    const version = ++this.generation;
    this.stopTracks();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Live picture camera needs HTTPS and camera support. Use Photo Preview for a saved image.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } } });
    if (version !== this.generation) { stream.getTracks().forEach((track) => track.stop()); return false; }
    this.stream = stream; video.srcObject = stream;
    void requestContinuousFocus(stream.getVideoTracks?.()[0]);
    for (const track of stream.getTracks()) track.addEventListener?.('ended', () => { if (version === this.generation) { this.stop(); onEnded?.(); } }, { once: true });
    try { await video.play(); } catch (reason) {
      if (version === this.generation) { this.stop(); video.srcObject = null; }
      throw reason;
    }
    return version === this.generation;
  }
  private stopTracks() { this.stream?.getTracks().forEach((track) => track.stop()); this.stream = null; }
  stop() { ++this.generation; this.stopTracks(); }
}

export function pictureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) throw new Error('Wait for the camera image to appear.');
  const ratio = Math.min(1, 360 / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.round(video.videoWidth * ratio), height = Math.round(video.videoHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Camera frame processing is unavailable.');
  context.drawImage(video, 0, 0, width, height);
  return { width, height, pixels: context.getImageData(0, 0, width, height).data };
}

// Keep the display capture sharp while sending only small pixels to CV. Both
// come from the same frozen draw, rather than different moments in the video.
export async function capturePictureFrame(video: HTMLVideoElement, analysis: HTMLCanvasElement) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) throw new Error('Wait for the camera image to appear.');
  const capture = document.createElement('canvas');
  const displayRatio = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
  capture.width = Math.round(video.videoWidth * displayRatio); capture.height = Math.round(video.videoHeight * displayRatio);
  try {
    const context = capture.getContext('2d'); if (!context) throw new Error('Camera capture is unavailable.');
    context.drawImage(video, 0, 0, capture.width, capture.height);
    const ratio = Math.min(1, 360 / Math.max(video.videoWidth, video.videoHeight));
    analysis.width = Math.round(video.videoWidth * ratio); analysis.height = Math.round(video.videoHeight * ratio);
    const small = analysis.getContext('2d', { willReadFrequently: true }); if (!small) throw new Error('Camera analysis is unavailable.');
    small.drawImage(capture, 0, 0, analysis.width, analysis.height);
    const pixels = small.getImageData(0, 0, analysis.width, analysis.height).data;
    const blob = await new Promise<Blob>((resolve, reject) => capture.toBlob((value) => value ? resolve(value) : reject(new Error('Could not capture a clear frame.')), 'image/png'));
    return { width: analysis.width, height: analysis.height, pixels, blob };
  } finally { capture.width = 0; capture.height = 0; }
}
