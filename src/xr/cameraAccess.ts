export function cameraFrameStatus(session: Pick<XRSession, 'enabledFeatures'>, views: readonly unknown[] | undefined) {
  if (!session.enabledFeatures?.includes('camera-access')) return 'Raw camera access not enabled in this session; pre-AR photo workflow. Target pixel access UNVERIFIED.';
  if (!views?.some((view) => (view as { camera?: unknown } | null)?.camera)) return 'Camera feature enabled but no camera metadata observed; readable frames UNVERIFIED.';
  return 'Camera metadata observed; GPU texture/pixel readback still UNVERIFIED. Photo workflow remains selected.';
}
