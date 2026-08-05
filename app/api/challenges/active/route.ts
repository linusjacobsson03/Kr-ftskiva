import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, expireOverdueAssignments } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }

    await expireOverdueAssignments();

    const pendingRows = await getAll<Record<string, unknown> & { deadline: string }>(
      `SELECT a.*, c.title, c.description, c.points, c.emoji, c.duration_seconds
       FROM challenge_assignments a
       JOIN challenges c ON c.id = a.challenge_id
       WHERE a.user_id = ? AND a.status = 'pending'
       ORDER BY a.deadline ASC`,
      [user.id]
    );

    // sqlite stores deadline as UTC "YYYY-MM-DD HH:MM:SS" — give the client a
    // proper ISO string so it can build an accurate countdown.
    const pending = pendingRows.map((row) => ({
      ...row,
      deadlineIso: new Date(row.deadline.replace(" ", "T") + "Z").toISOString(),
    }));

    const history = await getAll(
      `SELECT a.*, c.title, c.emoji, c.points as challenge_points
       FROM challenge_assignments a
       JOIN challenges c ON c.id = a.challenge_id
       WHERE a.user_id = ? AND a.status != 'pending'
       ORDER BY a.assigned_at DESC
       LIMIT 30`,
      [user.id]
    );

    return NextResponse.json({ pending, history, serverTime: new Date().toISOString() });
  } catch (err) {
    return apiError(err);
  }
}
