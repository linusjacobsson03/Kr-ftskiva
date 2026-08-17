import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, run } from "@/lib/db";
import { apiError } from "@/lib/apiError";
import { readUploadedMedia } from "@/lib/readUploadedMedia";

export async function GET() {
  try {
    const photos = await getAll(
      `SELECT p.id, p.user_id, p.caption, p.image_data, p.created_at, p.is_mirrored,
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

    const media = await readUploadedMedia(request);
    if (!media.ok) {
      return NextResponse.json({ error: media.error }, { status: media.status });
    }

    const result = await run(
      "INSERT INTO photos (user_id, caption, image_data, is_mirrored) VALUES (?, ?, ?, ?)",
      [user.id, media.caption, media.imageData, media.mirrored ? 1 : 0]
    );

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
