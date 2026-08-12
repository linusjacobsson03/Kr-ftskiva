import { NextResponse } from "next/server";
import { getAll } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET() {
  try {
    const submissions = await getAll(
      `SELECT a.id, a.photo_data, a.completed_at, a.points_awarded,
        c.title, c.emoji,
        (u.first_name || ' ' || u.last_name) AS display_name
       FROM challenge_assignments a
       JOIN challenges c ON c.id = a.challenge_id
       JOIN users u ON u.id = a.user_id
       WHERE a.status = 'completed'
       ORDER BY a.completed_at DESC
       LIMIT 100`
    );

    return NextResponse.json({ submissions });
  } catch (err) {
    return apiError(err);
  }
}
