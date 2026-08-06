/**
 * Client-side only: downsizes and re-encodes an image to a reasonably small
 * JPEG data URL before it's sent to the server. Keeps uploads fast on party
 * wifi and keeps the sqlite DB from ballooning.
 */

interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  /** Flip horizontally during capture — see videoFrameToCompressedDataUrl. */
  mirror?: boolean;
}

export async function fileToCompressedDataUrl(
  file: File,
  opts: CompressOptions = {}
): Promise<string> {
  const bitmap = await createImageBitmapSafe(file);
  return drawToCompressedDataUrl(bitmap, bitmap.width, bitmap.height, opts);
}

/**
 * Captures the current frame of a live <video> element — used by the
 * in-app camera view (CameraCapture) instead of handing off to the native
 * camera app. `mirror: true` flips the frame horizontally during capture.
 *
 * The front camera's live preview is shown mirrored (CSS `scaleX(-1)` on
 * the <video>) so framing yourself feels like looking in a mirror — normal,
 * expected UX. But the *saved* photo should look like how everyone else
 * actually sees you (and so any text/writing in frame reads correctly),
 * same convention apps like Snapchat use. Passing `mirror: true` here for
 * the front camera undoes the preview's mirroring at capture time, so what
 * gets uploaded is right-reading, not mirror-reversed.
 */
export function videoFrameToCompressedDataUrl(
  video: HTMLVideoElement,
  opts: CompressOptions = {}
): string {
  return drawToCompressedDataUrl(video, video.videoWidth, video.videoHeight, opts);
}

function drawToCompressedDataUrl(
  source: CanvasImageSource,
  width: number,
  height: number,
  { maxDimension = 2400, quality = 0.86, mirror = false }: CompressOptions = {}
): string {
  let targetWidth = width;
  let targetHeight = height;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunde inte bearbeta bilden.");
  if (mirror) {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", quality);
}

async function createImageBitmapSafe(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to <img> based approach (e.g. HEIC on some browsers)
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Kunde inte läsa bilden."));
    img.src = URL.createObjectURL(file);
  });
}
