import { describe, expect, it } from 'vitest';
import { cameraFrameStatus } from './cameraAccess';
describe('honest immersive camera-frame inspection', () => {
  it('does not equate session support or poses with usable pixels', () => {
    expect(cameraFrameStatus({ enabledFeatures: ['local', 'hit-test'] }, [{}])).toMatch(/not enabled/);
    expect(cameraFrameStatus({}, undefined)).toMatch(/UNVERIFIED/);
  });
  it('does not equate granted features or camera metadata with tested readback', () => {
    expect(cameraFrameStatus({ enabledFeatures: ['camera-access'] }, [{}])).toMatch(/no camera metadata/);
    expect(cameraFrameStatus({ enabledFeatures: ['camera-access'] }, [{ camera: { width: 640, height: 480 } }])).toMatch(/pixel readback still UNVERIFIED/);
  });
});
