/** Client-side only: helpers for saving photos/videos (already in-memory as data URLs) to the device. */

export function extensionForDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image|video)\/([a-zA-Z0-9.+-]+);base64,/);
  if (!match) return "bin";
  const subtype = match[2].toLowerCase();
  if (subtype === "jpeg") return "jpg";
  if (subtype.includes("quicktime")) return "mov";
  return subtype;
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Triggers one anchor-download per item, staggered slightly — browsers can
 * drop or block a burst of same-tick downloads, but a small delay between
 * each reliably lets multiple files through from a single click. This is
 * the fallback path (desktop, or browsers without file sharing) — see
 * saveItems() for the primary, iOS-friendly path.
 */
async function downloadMultiple(items: { dataUrl: string; filename: string }[]) {
  for (const item of items) {
    downloadDataUrl(item.dataUrl, item.filename);
    await new Promise((r) => setTimeout(r, 350));
  }
}

/**
 * Saves one or more photos/videos to the device. On iOS/Android this uses
 * the native share sheet (Web Share API with files), which is what actually
 * gets you a real "Save Image" / "Save Video" option straight into Photos —
 * plain `<a download>` on iOS Safari just opens the file instead of saving
 * it anywhere useful. Falls back to a classic browser download (e.g. on
 * desktop, where there's no share-to-Photos concept anyway).
 */
export async function saveItems(items: { dataUrl: string; filename: string }[]) {
  if (items.length === 0) return;

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare) {
    try {
      const files = await Promise.all(
        items.map(({ dataUrl, filename }) => dataUrlToFile(dataUrl, filename))
      );
      if (nav.canShare({ files })) {
        await nav.share({ files });
        return;
      }
    } catch (err) {
      // User backed out of the share sheet — that's a deliberate "no", not a
      // failure to fall back from.
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  await downloadMultiple(items);
}
