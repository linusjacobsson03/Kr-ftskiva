/** Client-side only: helpers for saving photos/videos (already in-memory as data URLs) to the device. */

export function extensionForDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image|video)\/([a-zA-Z0-9.+-]+);base64,/);
  if (!match) return "bin";
  const subtype = match[2].toLowerCase();
  if (subtype === "jpeg") return "jpg";
  if (subtype.includes("quicktime")) return "mov";
  return subtype;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Triggers one download per item, staggered slightly — browsers can drop or
 * block a burst of same-tick downloads, but a small delay between each
 * reliably lets multiple files through from a single click.
 */
export async function downloadMultiple(items: { dataUrl: string; filename: string }[]) {
  for (const item of items) {
    downloadDataUrl(item.dataUrl, item.filename);
    await new Promise((r) => setTimeout(r, 350));
  }
}
