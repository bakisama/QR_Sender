(() => {
  const $ = (id) => document.getElementById(id);
  const video = $("video");
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cameraMsg = $("cameraMsg");
  const startBtn = $("startBtn");
  const fileInput = $("fileInput");
  const scannerCard = $("scanner");
  const resultCard = $("result");
  const resultLink = $("resultLink");
  const resultText = $("resultText");
  const shareBtn = $("shareBtn");
  const copyBtn = $("copyBtn");
  const openBtn = $("openBtn");
  const againBtn = $("againBtn");
  const toast = $("toast");

  let stream = null;
  let scanning = false;
  let current = "";
  let detector = null;

  // Native detector is fast (Android Chrome); jsQR is the fallback (iOS Safari etc).
  if ("BarcodeDetector" in window) {
    BarcodeDetector.getSupportedFormats?.()
      .then((formats) => {
        if (formats.includes("qr_code")) detector = new BarcodeDetector({ formats: ["qr_code"] });
      })
      .catch(() => {});
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function isUrl(text) {
    try {
      const u = new URL(text);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraMsg.textContent = "Camera not available here. Use “Scan from photo”.";
      return;
    }
    try {
      cameraMsg.textContent = "Starting camera…";
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      cameraMsg.hidden = true;
      startBtn.textContent = "Stop camera";
      scanning = true;
      requestAnimationFrame(tick);
    } catch (err) {
      cameraMsg.hidden = false;
      cameraMsg.textContent =
        err && err.name === "NotAllowedError"
          ? "Camera permission denied. Allow it in your browser settings, or use “Scan from photo”."
          : "Couldn't start the camera. Use “Scan from photo”.";
    }
  }

  function stopCamera() {
    scanning = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    cameraMsg.hidden = false;
    cameraMsg.textContent = "Tap “Start camera” to scan";
    startBtn.textContent = "Start camera";
  }

  // Draw a source onto the canvas (downscaled) and decode it.
  async function decode(source, width, height) {
    if (detector) {
      try {
        const codes = await detector.detect(source);
        if (codes.length) return codes[0].rawValue;
      } catch {
        // fall through to jsQR
      }
    }
    const scale = Math.min(1, 800 / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const code = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
    return code ? code.data : null;
  }

  let busy = false;
  async function tick() {
    if (!scanning) return;
    if (!busy && video.readyState >= 2 && video.videoWidth) {
      busy = true;
      const text = await decode(video, video.videoWidth, video.videoHeight);
      busy = false;
      if (text && scanning) {
        onScanned(text);
        return;
      }
    }
    requestAnimationFrame(tick);
  }

  function onScanned(text) {
    stopCamera();
    navigator.vibrate?.(80);
    current = text.trim();
    const url = isUrl(current);

    resultLink.hidden = !url;
    resultText.hidden = url;
    openBtn.hidden = !url;
    if (url) {
      resultLink.textContent = current;
      resultLink.href = current;
      openBtn.href = current;
    } else {
      resultText.textContent = current;
    }
    shareBtn.textContent = url ? "Share link" : "Share text";

    scannerCard.hidden = true;
    resultCard.hidden = false;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Older browsers: textarea + execCommand
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  shareBtn.addEventListener("click", async () => {
    const data = isUrl(current) ? { url: current } : { text: current };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
      } catch (err) {
        if (err && err.name !== "AbortError") showToast("Share failed");
      }
      return;
    }
    showToast((await copy(current)) ? "Sharing not supported — copied instead" : "Couldn't share");
  });

  copyBtn.addEventListener("click", async () => {
    showToast((await copy(current)) ? "Copied" : "Couldn't copy");
  });

  againBtn.addEventListener("click", () => {
    resultCard.hidden = true;
    scannerCard.hidden = false;
    startCamera();
  });

  startBtn.addEventListener("click", () => (stream ? stopCamera() : startCamera()));

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    try {
      img.src = objUrl;
      await img.decode();
      const text = await decode(img, img.naturalWidth, img.naturalHeight);
      if (text) onScanned(text);
      else showToast("No QR code found in that photo");
    } catch {
      showToast("Couldn't read that image");
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  });

  // Try to start right away; browsers that need a tap will fall back to the button.
  startCamera();
})();
