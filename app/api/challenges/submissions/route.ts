import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mineOnly = searchParams.get("mine") === "1";
    const userIdParam = searchParams.get("userId");
    const userIdFilter = userIdParam ? Number(userIdParam) : null;

    if (userIdFilter !== null && (!Number.isInteger(userIdFilter) || userIdFilter <= 0)) {
      return NextResponse.json({ error: "Ogiltigt userId." }, { status: 400 });
    }

    const user = mineOnly ? await getCurrentUser() : null;

    if (mineOnly && !user) {
      return NextResponse.json({ submissions: [] });
    }

    // Profile view: all completed challenges for a user (photo optional).
    if (userIdFilter) {
      const submissions = await getAll(
        `SELECT a.id, a.user_id, a.photo_data, a.completed_at, a.points_awarded,
          c.title, c.emoji,
          (u.first_name || ' ' || u.last_name) AS display_name
         FROM challenge_assignments a
         JOIN challenges c ON c.id = a.challenge_id
         JOIN users u ON u.id = a.user_id
         WHERE a.status = 'completed' AND a.user_id = ?
         ORDER BY a.completed_at DESC
         LIMIT 100`,
        [userIdFilter]
      );
      return NextResponse.json({ submissions });
    }

    // Album / "mine": only rows with photo evidence.
    const submissions = mineOnly
      ? await getAll(
          `SELECT a.id, a.user_id, a.photo_data, a.completed_at, a.points_awarded,
            c.title, c.emoji,
            (u.first_name || ' ' || u.last_name) AS display_name
           FROM challenge_assignments a
           JOIN challenges c ON c.id = a.challenge_id
           JOIN users u ON u.id = a.user_id
           WHERE a.status = 'completed' AND a.photo_data IS NOT NULL AND a.photo_data != ''
             AND a.user_id = ?
           ORDER BY a.completed_at DESC
           LIMIT 100`,
          [user!.id]
        )
      : await getAll(
          `SELECT a.id, a.user_id, a.photo_data, a.completed_at, a.points_awarded,
            c.title, c.emoji,
            (u.first_name || ' ' || u.last_name) AS display_name
           FROM challenge_assignments a
           JOIN challenges c ON c.id = a.challenge_id
           JOIN users u ON u.id = a.user_id
           WHERE a.status = 'completed' AND a.photo_data IS NOT NULL AND a.photo_data != ''
           ORDER BY a.completed_at DESC
           LIMIT 100`
        );

    return NextResponse.json({ submissions });
  } catch (err) {
    return apiError(err);
  }
}
