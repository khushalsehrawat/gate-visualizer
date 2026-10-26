export type CapabilityStatus = 'checking' | 'insecure' | 'unavailable' | 'unsupported' | 'supported' | 'error';
export interface CapabilityResult { status: CapabilityStatus; message: string }
export interface CapabilityEnvironment {
  secureContext: boolean;
  xr?: Pick<XRSystem, 'isSessionSupported'> | undefined;
}
export const checking: CapabilityResult = { status: 'checking', message: 'Checking immersive AR support…' };

export async function detectCapability(environment: CapabilityEnvironment): Promise<CapabilityResult> {
  if (!environment.secureContext) return { status: 'insecure', message: 'Open this page over trusted HTTPS to check WebXR.' };
  if (!environment.xr) return { status: 'unavailable', message: 'WebXR is unavailable in this browser. Try Chrome on an ARCore-compatible Android device.' };
  try {
    const supported = await environment.xr.isSessionSupported('immersive-ar');
    return supported
      ? { status: 'supported', message: 'This browser reports immersive AR support. Tap Start AR to request a real session. Physical-device behavior is UNVERIFIED.' }
      : { status: 'unsupported', message: 'This browser reports that immersive AR is unsupported on this device.' };
  } catch {
    return { status: 'error', message: 'The WebXR support check failed. Check browser permissions and retry.' };
  }
}

export function detectBrowserCapability(): Promise<CapabilityResult> {
  return detectCapability({ secureContext: window.isSecureContext, xr: navigator.xr });
}
