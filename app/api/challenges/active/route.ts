import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, expireOverdueAssignments } from "@/lib/db";
import { apiError } from "@/lib/apiError";
import { dispatchDueSchedules } from "@/lib/scheduler";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }

    // Best-effort: on serverless hosts (Vercel) there's no long-lived
    // process for lib/scheduler.ts's setInterval poller to run in, so a
    // scheduled challenge would otherwise just sit there forever. This
    // route is polled every few seconds by every guest with the app open
    // (see app/hem/page.tsx, app/challenges/page.tsx), which makes it a
    // good opportunistic trigger — as long as *someone's* phone is polling,
    // due schedules get dispatched within seconds. Never allowed to fail
    // this request even if dispatch itself errors.
    dispatchDueSchedules().catch(() => undefined);

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
