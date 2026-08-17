export const VIDEO_MAX_SECONDS = 5;
export const VIDEO_BITRATE = 6_000_000;
export const AUDIO_BITRATE = 160_000;
export const MAX_VIDEO_BYTES = 4_200_000;

export function videoCaptureConstraints(facingMode: "user" | "environment") {
  return {
    facingMode: { ideal: facingMode },
    width: { min: 1280, ideal: 1920 },
    height: { min: 720, ideal: 1080 },
    frameRate: { ideal: 30, max: 30 },
  } as const;
}

export function pickRecorderMimeType(): string {
  const candidates = [
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export function fileNameForVideoBlob(blob: Blob): string {
  return blob.type.includes("webm") ? "klipp.webm" : "klipp.mp4";
}

export function isVideoSrc(src: string, mime?: string): boolean {
  if (mime?.startsWith("video/")) return true;
  return src.startsWith("data:video/") || src.startsWith("blob:");
}
