/** Vercel caps the whole request at 4.5MB. Leave room for multipart headers. */
export const MAX_UPLOAD_BYTES = 4_200_000;
/** JSON/base64 path (photos still use this). */
export const MAX_DATA_URL_CHARS = 4_400_000;

export async function readUploadedMedia(request: Request): Promise<
  | { ok: true; imageData: string; caption: string; mirrored: boolean }
  | { ok: false; error: string; status: number }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return { ok: false, error: "Ogiltig förfrågan.", status: 400 };
    }

    const file = form.get("file");
    const caption = String(form.get("caption") ?? "").slice(0, 200);
    const mirrored = form.get("mirrored") === "1";
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Ingen bild eller video hittades.", status: 400 };
    }
    const mime = file.type || "";
    const isVideo = mime.startsWith("video/");
    const isImage = mime.startsWith("image/");
    if (!isVideo && !isImage) {
      return { ok: false, error: "Ingen bild eller video hittades.", status: 400 };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        error: isVideo ? "Videon är för stor, spela in ett kortare klipp." : "Bilden är för stor.",
        status: 413,
      };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    return {
      ok: true,
      imageData: `data:${mime};base64,${buf.toString("base64")}`,
      caption,
      mirrored,
    };
  }

  let body: { imageData?: string; caption?: string; mirrored?: boolean };
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Ogiltig förfrågan.", status: 400 };
  }

  const imageData = (body.imageData ?? "").toString();
  const caption = (body.caption ?? "").toString().slice(0, 200);
  const mirrored = Boolean(body.mirrored);
  const isVideo = imageData.startsWith("data:video/");
  const isImage = imageData.startsWith("data:image/");
  if (!isVideo && !isImage) {
    return { ok: false, error: "Ingen bild eller video hittades.", status: 400 };
  }
  if (imageData.length > MAX_DATA_URL_CHARS) {
    return {
      ok: false,
      error: isVideo ? "Videon är för stor, spela in ett kortare klipp." : "Bilden är för stor.",
      status: 413,
    };
  }
  return { ok: true, imageData, caption, mirrored };
}
