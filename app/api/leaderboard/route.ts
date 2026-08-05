import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, expireOverdueAssignments } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  await expireOverdueAssignments();

  const leaderboard = await getAll(
    `SELECT u.id, (u.first_name || ' ' || u.last_name) AS display_name,
      COALESCE(SUM(a.points_awarded), 0) as points,
      COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as challenges_completed
     FROM users u
     LEFT JOIN challenge_assignments a ON a.user_id = u.id AND a.status = 'completed'
     GROUP BY u.id
     ORDER BY points DESC, challenges_completed DESC, display_name ASC`
  );

  return NextResponse.json({ leaderboard });
}
