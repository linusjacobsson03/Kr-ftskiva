import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db, { expireOverdueAssignments } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  expireOverdueAssignments();

  const rows = db
    .prepare(
      `SELECT u.id, u.display_name, u.avatar_emoji, u.username,
        COALESCE(SUM(a.points_awarded), 0) as points,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as challenges_completed
       FROM users u
       LEFT JOIN challenge_assignments a ON a.user_id = u.id AND a.status = 'completed'
       GROUP BY u.id
       ORDER BY points DESC, challenges_completed DESC, u.display_name ASC`
    )
    .all();

  return NextResponse.json({ leaderboard: rows });
}
