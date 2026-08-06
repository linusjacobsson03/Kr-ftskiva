import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, run } from "@/lib/db";
import { apiError } from "@/lib/apiError";

// Vercel Functions hard-cap the whole request body — image or video, doesn't
// matter — at 4.5MB regardless of plan, and base64 inflates binary size by
// ~1.33x. Both limits below leave headroom under that real ceiling; getting
// this wrong means the platform rejects the request before our code (and
// its friendly error message) ever runs, back to an opaque failure. A
// higher-quality photo at 2400px/86% JPEG still lands nowhere near this in
// practice (typically a few hundred KB to ~1.5MB) — it's a safety cap, not
// the expected size.
const MAX_IMAGE_CHARS = 4_400_000; // ~3.3MB binary
const MAX_VIDEO_CHARS = 4_400_000; // ~3.3MB binary — VideoRecorder targets well below this

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }

    const photos = await getAll(
      `SELECT p.id, p.user_id, p.caption, p.image_data, p.created_at,
        (u.first_name || ' ' || u.last_name) AS display_name
       FROM photos p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 300`
    );

    return NextResponse.json({ photos });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }

    let body: { imageData?: string; caption?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    const imageData = (body.imageData ?? "").toString();
    const caption = (body.caption ?? "").toString().slice(0, 200);

    const isVideo = imageData.startsWith("data:video/");
    const isImage = imageData.startsWith("data:image/");
    if (!isVideo && !isImage) {
      return NextResponse.json({ error: "Ingen bild eller video hittades." }, { status: 400 });
    }
    const limit = isVideo ? MAX_VIDEO_CHARS : MAX_IMAGE_CHARS;
    if (imageData.length > limit) {
      return NextResponse.json(
        { error: isVideo ? "Videon är för stor, spela in ett kortare klipp." : "Bilden är för stor." },
        { status: 413 }
      );
    }

    const result = await run(
      "INSERT INTO photos (user_id, caption, image_data) VALUES (?, ?, ?)",
      [user.id, caption, imageData]
    );

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
