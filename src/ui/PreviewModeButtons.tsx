interface Props { page: string; arActive: boolean }

export function PreviewModeButtons({ page, arActive }: Props) {
  return <nav className={`preview-mode-picker ${['live', 'picture'].includes(page) ? 'is-compact' : ''}`} aria-label="Choose your camera preview">
    <a className="preview-mode-button" href="#/live" aria-current={page === 'live' ? 'page' : undefined}>
      <strong>Live Camera AR</strong><span>Point at your real entrance. Open the camera and place your gate.</span>
    </a>
    <a className="preview-mode-button" href="#/picture" aria-current={page === 'picture' ? 'page' : undefined} aria-disabled={arActive}
      onClick={(event) => { if (arActive) event.preventDefault(); }}>
      <strong>Camera on Entrance Picture</strong><span>{arActive ? 'Exit AR first to switch cameras.' : 'Point at an entrance photo on paper or another screen. Uses the live camera.'}</span>
    </a>
  </nav>;
}
