/**
 * Client-side only: downsizes and re-encodes an image file to a reasonably
 * small JPEG data URL before it's sent to the server. Keeps uploads fast on
 * party wifi and keeps the sqlite DB from ballooning.
 */
export async function fileToCompressedDataUrl(
  file: File,
  { maxDimension = 1600, quality = 0.78 }: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  const bitmap = await createImageBitmapSafe(file);
  const { width, height } = bitmap;

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
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

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
