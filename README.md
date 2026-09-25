# QR Sender

A mobile web page that scans a QR code with your phone's camera and lets you share the link it contains, using your phone's share sheet (WhatsApp, Messages, etc.).

**Live site:** https://bakisama.github.io/QR_Sender/

## Features
- Live camera scanning. It uses the browser's built-in `BarcodeDetector` where the browser supports it and falls back to the bundled [jsQR](https://github.com/cozmo/jsQR), so it also works on iPhone Safari.
- **Scan from photo** reads a QR code from a screenshot or a picture in your gallery.
- **Share link** opens the phone's share sheet. If the browser doesn't support sharing, it copies the link instead.
- Also has **Copy**, **Open** and **Scan again** buttons.
- You can add it to your home screen and use it like an app.

## Deployment
The app is the static files in the repo root (`index.html`, `app.js`, `style.css`, `vendor/`).

GitHub Pages is set to **Deploy from a branch** with the `/ (root)` folder, so every push publishes automatically. The empty `.nojekyll` file tells Pages to serve the files as they are, without running Jekyll.
