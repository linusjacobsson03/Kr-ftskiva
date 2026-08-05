import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, getOne, run } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  if (!user.is_admin) {
    return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
  }

  const challenges = await getAll(
    `SELECT c.*,
      (SELECT COUNT(*) FROM challenge_assignments a WHERE a.challenge_id = c.id) as times_sent,
      (SELECT COUNT(*) FROM challenge_assignments a WHERE a.challenge_id = c.id AND a.status = 'pending') as active_count
     FROM challenges c
     ORDER BY c.created_at DESC`
  );

  return NextResponse.json({ challenges });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  if (!user.is_admin) {
    return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    points?: number;
    durationSeconds?: number;
    emoji?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }

  const title = (body.title ?? "").toString().trim().slice(0, 120);
  const description = (body.description ?? "").toString().trim().slice(0, 500);
  const points = Math.max(1, Math.min(1000, Number(body.points) || 10));
  const durationSeconds = Math.max(
    15,
    Math.min(3600, Number(body.durationSeconds) || 120)
  );
  const emoji = (body.emoji ?? "🎯").toString().slice(0, 8) || "🎯";

  if (!title) {
    return NextResponse.json({ error: "Ge utmaningen en titel." }, { status: 400 });
  }

  const result = await run(
    `INSERT INTO challenges (title, description, points, duration_seconds, emoji, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description, points, durationSeconds, emoji, user.id]
  );

  const challenge = await getOne("SELECT * FROM challenges WHERE id = ?", [
    result.lastInsertRowid,
  ]);

  return NextResponse.json({ challenge }, { status: 201 });
}
