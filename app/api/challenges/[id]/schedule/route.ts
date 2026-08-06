import { NextResponse } from "next/server";
import { getAdminSession, getCurrentUser } from "@/lib/auth";
import { getAll, getOne, run, runBatch, toSqliteDatetime, ChallengeRow, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/[id]/schedule">
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const challenge = await getOne<ChallengeRow>("SELECT * FROM challenges WHERE id = ?", [id]);
    if (!challenge) {
      return NextResponse.json({ error: "Utmaningen hittades inte." }, { status: 404 });
    }
    if (challenge.status !== "approved") {
      return NextResponse.json(
        { error: "Godkänn utmaningen innan du schemalägger den." },
        { status: 400 }
      );
    }

    let body: { sendAt?: string; target?: string; userIds?: number[]; userId?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    const sendAtDate = new Date((body.sendAt ?? "").toString());
    if (Number.isNaN(sendAtDate.getTime())) {
      return NextResponse.json({ error: "Ange en giltig tid." }, { status: 400 });
    }

    const target = body.target === "all" || body.target === "user" ? body.target : "random";
    const sendAtSql = toSqliteDatetime(sendAtDate);

    // See app/api/challenges/route.ts — created_by is just bookkeeping now
    // that admin access isn't tied to a particular user account.
    const createdBy = (await getCurrentUser())?.id ?? null;

    if (target === "user") {
      // userId (singular) kept for backwards compatibility with older
      // clients; userIds (plural) lets an admin pick one, several, or — by
      // checking everyone including themselves — effectively all people.
      // The schema only has room for one target_user_id per schedule row,
      // so picking several people just inserts several rows that share the
      // same challenge and send time, one per recipient.
      const rawIds = body.userIds?.length ? body.userIds : body.userId ? [body.userId] : [];
      const wantedIds = [...new Set(rawIds.map(Number).filter((n) => !Number.isNaN(n) && n > 0))];
      if (wantedIds.length === 0) {
        return NextResponse.json({ error: "Välj minst en person." }, { status: 400 });
      }
      const existing = await getAll<UserRow>(
        `SELECT * FROM users WHERE id IN (${wantedIds.map(() => "?").join(",")})`,
        wantedIds
      );
      if (existing.length === 0) {
        return NextResponse.json({ error: "Personerna hittades inte." }, { status: 404 });
      }
      await runBatch(
        existing.map((u) => ({
          sql: `INSERT INTO challenge_schedule (challenge_id, send_at, target_type, target_user_id, created_by)
                VALUES (?, ?, 'user', ?, ?)`,
          args: [challenge.id, sendAtSql, u.id, createdBy],
        }))
      );
      return NextResponse.json({ ok: true, count: existing.length }, { status: 201 });
    }

    const result = await run(
      `INSERT INTO challenge_schedule (challenge_id, send_at, target_type, target_user_id, created_by)
       VALUES (?, ?, ?, NULL, ?)`,
      [challenge.id, sendAtSql, target, createdBy]
    );

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
