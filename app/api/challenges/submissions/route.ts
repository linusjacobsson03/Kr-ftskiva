import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll } from "@/lib/db";
import { apiError } from "@/lib/apiError";

type SubmissionRow = {
  id: number;
  user_id: number;
  completed_at: string;
  points_awarded: number;
  is_mirrored: number;
  has_photo: number;
  is_video: number;
  title: string;
  emoji: string;
  display_name: string;
};

function toPublicSubmission(row: SubmissionRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    completed_at: row.completed_at,
    points_awarded: row.points_awarded,
    is_mirrored: row.is_mirrored,
    is_video: row.is_video,
    title: row.title,
    emoji: row.emoji,
    display_name: row.display_name,
    photo_data: row.has_photo ? `/api/media/evidence/${row.id}` : null,
  };
}

const LIST_FIELDS = `a.id, a.user_id, a.completed_at, a.points_awarded, a.is_mirrored,
  CASE WHEN a.photo_data IS NOT NULL AND a.photo_data != '' THEN 1 ELSE 0 END AS has_photo,
  CASE WHEN a.photo_data LIKE 'data:video/%' THEN 1 ELSE 0 END AS is_video,
  c.title, c.emoji,
  (u.first_name || ' ' || u.last_name) AS display_name`;

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

    if (userIdFilter) {
      const rows = await getAll<SubmissionRow>(
        `SELECT ${LIST_FIELDS}
         FROM challenge_assignments a
         JOIN challenges c ON c.id = a.challenge_id
         JOIN users u ON u.id = a.user_id
         WHERE a.status = 'completed' AND a.user_id = ?
         ORDER BY a.completed_at DESC
         LIMIT 100`,
        [userIdFilter]
      );
      return NextResponse.json({ submissions: rows.map(toPublicSubmission) });
    }

    const submissions = mineOnly
      ? await getAll<SubmissionRow>(
          `SELECT ${LIST_FIELDS}
           FROM challenge_assignments a
           JOIN challenges c ON c.id = a.challenge_id
           JOIN users u ON u.id = a.user_id
           WHERE a.status = 'completed' AND a.photo_data IS NOT NULL AND a.photo_data != ''
             AND a.user_id = ?
           ORDER BY a.completed_at DESC
           LIMIT 100`,
          [user!.id]
        )
      : await getAll<SubmissionRow>(
          `SELECT ${LIST_FIELDS}
           FROM challenge_assignments a
           JOIN challenges c ON c.id = a.challenge_id
           JOIN users u ON u.id = a.user_id
           WHERE a.status = 'completed' AND a.photo_data IS NOT NULL AND a.photo_data != ''
           ORDER BY a.completed_at DESC
           LIMIT 100`
        );

    return NextResponse.json({ submissions: submissions.map(toPublicSubmission) });
  } catch (err) {
    return apiError(err);
  }
}
