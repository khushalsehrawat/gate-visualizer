export class PictureCamera {
  private generation = 0;
  private stream: MediaStream | null = null;
  async start(video: HTMLVideoElement, onEnded?: () => void) {
    const version = ++this.generation;
    this.stopTracks();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Live picture camera needs HTTPS and camera support. Use Photo Preview for a saved image.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } });
    if (version !== this.generation) { stream.getTracks().forEach((track) => track.stop()); return false; }
    this.stream = stream; video.srcObject = stream;
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
