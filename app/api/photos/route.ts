import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";

const MAX_IMAGE_CHARS = 8_000_000; // ~6MB binary, generous for a compressed JPEG

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const rows = db
    .prepare(
      `SELECT p.id, p.caption, p.image_data, p.created_at, u.display_name, u.avatar_emoji, u.username
       FROM photos p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 300`
    )
    .all();

  return NextResponse.json({ photos: rows });
}

export async function POST(request: Request) {
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

  if (!imageData.startsWith("data:image/")) {
    return NextResponse.json({ error: "Ingen bild hittades." }, { status: 400 });
  }
  if (imageData.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "Bilden är för stor." }, { status: 413 });
  }

  const result = db
    .prepare(
      "INSERT INTO photos (user_id, caption, image_data) VALUES (?, ?, ?)"
    )
    .run(user.id, caption, imageData);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
