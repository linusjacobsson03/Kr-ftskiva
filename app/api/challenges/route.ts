import { NextResponse } from "next/server";
import { getAdminSession, getCurrentUser } from "@/lib/auth";
import { getAll, getOne, run, CHALLENGE_DURATION_SECONDS } from "@/lib/db";
import { apiError } from "@/lib/apiError";

const ADMIN_ERROR = "Fel lösenord eller session har gått ut.";

export async function GET(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 401 });
    }

    // Default view is the approved pool (what you can send out); pass
    // ?status=pending to fetch the "att godkänna"-queue instead.
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") === "pending" ? "pending" : "approved";

    const challenges = await getAll(
      `SELECT c.*,
        (SELECT COUNT(*) FROM challenge_assignments a WHERE a.challenge_id = c.id) as times_sent,
        (SELECT COUNT(*) FROM challenge_assignments a WHERE a.challenge_id = c.id AND a.status = 'pending') as active_count,
        (SELECT COUNT(*) FROM challenge_schedule s WHERE s.challenge_id = c.id AND s.status = 'scheduled') as scheduled_count
       FROM challenges c
       WHERE c.status = ?
       ORDER BY c.created_at DESC`,
      [status]
    );

    return NextResponse.json({ challenges });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 401 });
    }

    let body: {
      title?: string;
      description?: string;
      points?: number;
      emoji?: string;
      suggestedTime?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    const title = (body.title ?? "").toString().trim().slice(0, 120);
    const description = (body.description ?? "").toString().trim().slice(0, 500);
    // Difficulty scale: 1 Lätt, 2 Medel, 3 Svår, 5 Vågad (see difficultyOf in
    // app/admin/page.tsx). Clamped to 1-5 so manually created challenges
    // stay on the same scale as the suggestion batch.
    const points = Math.max(1, Math.min(5, Number(body.points) || 1));
    const emoji = (body.emoji ?? "🎯").toString().slice(0, 8) || "🎯";
    // "HH:MM" hint used to prefill the scheduling form later — optional.
    const suggestedTimeRaw = (body.suggestedTime ?? "").toString().trim();
    const suggestedTime = /^\d{2}:\d{2}$/.test(suggestedTimeRaw) ? suggestedTimeRaw : null;

    if (!title) {
      return NextResponse.json({ error: "Ge utmaningen en titel." }, { status: 400 });
    }

    // The admin area no longer requires being logged into a particular
    // party-guest account (see lib/auth.ts) — attribute the challenge to
    // whoever's regular session happens to be active, if any, purely for
    // bookkeeping. Nullable, nothing depends on it being set.
    const createdBy = (await getCurrentUser())?.id ?? null;

    const result = await run(
      `INSERT INTO challenges (title, description, points, duration_seconds, emoji, created_by, suggested_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, points, CHALLENGE_DURATION_SECONDS, emoji, createdBy, suggestedTime]
    );

    const challenge = await getOne("SELECT * FROM challenges WHERE id = ?", [
      result.lastInsertRowid,
    ]);

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
