import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAll } from "@/lib/db";
import { apiError } from "@/lib/apiError";
import { dispatchDueSchedules } from "@/lib/scheduler";

interface ScheduleQueryRow {
  id: number;
  challenge_id: number;
  challenge_title: string;
  challenge_emoji: string;
  send_at: string;
  target_type: "random" | "all" | "user";
  target_user_id: number | null;
  target_first_name: string | null;
  target_last_name: string | null;
  status: "scheduled" | "sending" | "sent" | "canceled" | "failed";
  error: string | null;
  sent_at: string | null;
}

export async function GET() {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    // Same opportunistic trigger as /api/challenges/active — see comment
    // there. The admin Schema-flik polls this route every 20s, so as long as
    // it's open, due sends still go out even without a persistent server
    // process (Vercel).
    dispatchDueSchedules().catch(() => undefined);

    const rows = await getAll<ScheduleQueryRow>(
      `SELECT s.id, s.challenge_id, c.title as challenge_title, c.emoji as challenge_emoji,
              s.send_at, s.target_type, s.target_user_id,
              u.first_name as target_first_name, u.last_name as target_last_name,
              s.status, s.error, s.sent_at
       FROM challenge_schedule s
       JOIN challenges c ON c.id = s.challenge_id
       LEFT JOIN users u ON u.id = s.target_user_id
       ORDER BY s.send_at ASC`
    );

    const schedule = rows.map((r) => ({
      id: r.id,
      challenge_id: r.challenge_id,
      challenge_title: r.challenge_title,
      challenge_emoji: r.challenge_emoji,
      // Stored as sqlite UTC "YYYY-MM-DD HH:MM:SS" — normalize to real ISO
      // for the client, same convention as /api/challenges/active.
      send_at: new Date(r.send_at.replace(" ", "T") + "Z").toISOString(),
      target_type: r.target_type,
      target_user_id: r.target_user_id,
      target_display_name:
        r.target_first_name && r.target_last_name
          ? `${r.target_first_name} ${r.target_last_name}`
          : null,
      status: r.status,
      error: r.error,
      sent_at: r.sent_at ? new Date(r.sent_at.replace(" ", "T") + "Z").toISOString() : null,
    }));

    return NextResponse.json({ schedule });
  } catch (err) {
    return apiError(err);
  }
}
