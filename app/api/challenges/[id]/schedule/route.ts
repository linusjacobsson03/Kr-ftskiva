import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOne, run, toSqliteDatetime, ChallengeRow, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/[id]/schedule">
) {
  try {
    const admin = await getCurrentUser();
    if (!admin) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }
    if (!admin.is_admin) {
      return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
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

    let body: { sendAt?: string; target?: string; userId?: number };
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

    let targetUserId: number | null = null;
    if (target === "user") {
      const userId = Number(body.userId);
      if (!userId) {
        return NextResponse.json({ error: "Välj en person." }, { status: 400 });
      }
      const targetUser = await getOne<UserRow>("SELECT * FROM users WHERE id = ?", [userId]);
      if (!targetUser) {
        return NextResponse.json({ error: "Personen hittades inte." }, { status: 404 });
      }
      targetUserId = targetUser.id;
    }

    const result = await run(
      `INSERT INTO challenge_schedule (challenge_id, send_at, target_type, target_user_id, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [challenge.id, toSqliteDatetime(sendAtDate), target, targetUserId, admin.id]
    );

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
