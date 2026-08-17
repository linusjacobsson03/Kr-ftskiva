/**
 * Front-camera photos are flipped at capture so they match the mirrored
 * preview. MediaRecorder records the raw camera track (not mirrored), so
 * selfie video looks "wrong" next to a selfie photo unless we re-draw
 * each frame flipped onto a canvas and record that instead.
 */
export function createMirroredCaptureStream(
  video: HTMLVideoElement,
  sourceStream: MediaStream
): { stream: MediaStream; stop: () => void } {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;pointer-events:none";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx || typeof canvas.captureStream !== "function") {
    canvas.remove();
    return { stream: sourceStream, stop: () => {} };
  }

  const draw = () => {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
  };

  draw();

  let canvasStream: MediaStream;
  try {
    canvasStream = canvas.captureStream(30);
  } catch {
    canvas.remove();
    return { stream: sourceStream, stop: () => {} };
  }

  const videoTrack = canvasStream.getVideoTracks()[0] as MediaStreamTrack & {
    requestFrame?: () => void;
  };

  let raf = 0;
  let running = true;
  const loop = () => {
    if (!running) return;
    draw();
    videoTrack.requestFrame?.();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const mixed = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...sourceStream.getAudioTracks(),
  ]);

  return {
    stream: mixed,
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
      canvasStream.getTracks().forEach((t) => t.stop());
      canvas.remove();
    },
  };
}
