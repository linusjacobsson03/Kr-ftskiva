import { NextResponse } from "next/server";
import { hasAppAccess } from "@/lib/auth";
import { getAll, expireOverdueAssignments } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET() {
  try {
    if (!(await hasAppAccess())) {
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
  } catch (err) {
    return apiError(err);
  }
}
