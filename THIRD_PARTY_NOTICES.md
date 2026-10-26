# OpenCV.js

The photo detector uses `@techstark/opencv-js` version `5.0.0-release.1` as resolved in package-lock.json. This npm package distributes the OpenCV JavaScript/WebAssembly build; its upstream project states that the compiled file comes from the OpenCV documentation distribution.

- Package source and attribution: https://github.com/TechStark/opencv-js
- OpenCV project: https://opencv.org/
- Package license: Apache License 2.0. A copy from the installed package is included in `public/third-party/opencv-LICENSE.txt` and shipped at `/third-party/opencv-LICENSE.txt`.

The generated production build self-hosts the unmodified compiled OpenCV asset (with a hashed filename). It is loaded only by the local detection worker. No trained weights or semantic gate-recognition model are supplied or downloaded.
