import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const submissions = db
    .prepare(
      `SELECT a.id, a.photo_data, a.completed_at, a.points_awarded,
        c.title, c.emoji,
        u.display_name, u.avatar_emoji
       FROM challenge_assignments a
       JOIN challenges c ON c.id = a.challenge_id
       JOIN users u ON u.id = a.user_id
       WHERE a.status = 'completed'
       ORDER BY a.completed_at DESC
       LIMIT 100`
    )
    .all();

  return NextResponse.json({ submissions });
}
