# Upload your gate and see it in the live AR camera

This uses the existing genuine WebXR world-tracking engine. It does not place a screen-fixed image over a normal camera stream.

1. Open `#/live` on an ARCore-compatible Android 12+ phone using Chrome.
2. Under **Upload your gate for the live camera**, choose your PNG/JPG/WebP. Use transparent PNG/WebP to see through bars; JPG remains opaque.
3. Enter measured opening width/height. The initial 3 × 1.8 m values are estimates.
4. Tap **Start AR — open live camera** and allow Chrome's XR permissions.
5. Move slowly and scan textured ground in good light. Aim the teal ring at the **left inner pillar base** and capture, then the **right base** at the same level.
6. The uploaded gate appears in world space. Move sideways to check it, adjust its position/size if needed, then **Lock Placement**. Exit AR to stop the session.

If hit testing is unavailable, the existing manual fixed-distance fallback remains approximate. No automatic entrance plane or depth is claimed. Physical-phone behavior still needs testing on the user's device.

## Why your Wi-Fi HTTP link may not open the camera

`http://192.168.x.x:5173` works for the website and Photo Preview, but is not a secure context for WebXR. A host flag cannot remove Chrome's restriction. Real mobile AR needs **trusted HTTPS** or an actually forwarded **phone-local localhost** origin. See [Google's WebXR requirements](https://developers.google.com/ar/develop/webxr/requirements).

## Option A: USB forwarding — no public hosting needed

On the computer:

```powershell
cd D:\GateVisualizer
npm ci
npm run dev:mobile
```

Keep that terminal running. If dependencies already exist, skip npm ci.

1. On Android, enable Developer options and USB debugging.
2. Connect the phone to the computer with a data-capable USB cable. Unlock it and accept the debugging authorization.
3. Open **desktop Chrome** at `chrome://inspect/#devices`.
4. Enable **Discover USB devices** and confirm your phone appears.
5. Open **Port forwarding**, add device port **5173** mapped to **localhost:5173**, enable port forwarding and save.
6. On the **phone's Chrome**, open:

```text
http://localhost:5173/#/live
```

This address reaches the PC only while forwarding is configured and the USB/dev-server connection is active. Phone localhost without forwarding will not reach the computer.

If Android platform-tools/adb are already installed, `adb reverse tcp:5173 tcp:5173` is another forwarding method; it is optional. No adb tool was available in the implementation environment.

## Option B: Wireless trusted HTTPS

Build with `npm run build` and serve all of `dist/` on a static HTTPS host with a certificate trusted by the phone, using the existing deployment/header instructions in README.md. Open that HTTPS URL with `#/live`. No backend or paid API is needed. No public deployment/tunnel or fabricated mobile URL was created here.

## If Start AR stays disabled

- Check the readiness message on the Live page and use **Recheck device**.
- Verify trusted HTTPS or USB-forwarded phone localhost, not a plain LAN HTTP link.
- Use Chrome on a supported ARCore Android phone with Google Play Services for AR installed and enabled.
- Wait for the selected gate to finish decoding. Failed loads show an error and retain the previous working design.
- If the device/browser truly lacks immersive-ar, tracked live AR cannot be enabled by requesting ordinary camera access. Photo Preview remains the explicit alternative.
