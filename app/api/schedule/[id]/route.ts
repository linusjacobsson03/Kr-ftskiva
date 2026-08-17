import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAll, getOne, run, toSqliteDatetime, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

const ADMIN_ERROR = "Fel lösenord eller session har gått ut.";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/schedule/[id]">
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 401 });
    }

    const { id } = await ctx.params;
    const row = await getOne<{
      id: number;
      challenge_id: number;
      status: string;
    }>("SELECT id, challenge_id, status FROM challenge_schedule WHERE id = ?", [id]);

    if (!row) {
      return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
    }

    let body: {
      title?: string;
      sendAt?: string;
      target?: string;
      userIds?: number[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    const title = (body.title ?? "").toString().trim().slice(0, 120);
    if (title) {
      await run("UPDATE challenges SET title = ? WHERE id = ?", [title, row.challenge_id]);
    }

    const wantsScheduleChange =
      body.sendAt !== undefined || body.target !== undefined || body.userIds !== undefined;
    if (wantsScheduleChange && row.status !== "scheduled") {
      return NextResponse.json(
        { error: "Tid och mottagare kan bara ändras innan utmaningen skickats." },
        { status: 400 }
      );
    }

    if (row.status === "scheduled") {
      if (body.sendAt) {
        const sendAtDate = new Date(body.sendAt.toString());
        if (Number.isNaN(sendAtDate.getTime())) {
          return NextResponse.json({ error: "Ange en giltig tid." }, { status: 400 });
        }
        const hh = String(sendAtDate.getHours()).padStart(2, "0");
        const mm = String(sendAtDate.getMinutes()).padStart(2, "0");
        await run("UPDATE challenge_schedule SET send_at = ? WHERE id = ?", [
          toSqliteDatetime(sendAtDate),
          row.id,
        ]);
        await run("UPDATE challenges SET suggested_time = ? WHERE id = ?", [
          `${hh}:${mm}`,
          row.challenge_id,
        ]);
      }

      if (body.target !== undefined) {
        const target =
          body.target === "all" || body.target === "user" ? body.target : "random";

        if (target === "user") {
          const wantedIds = [
            ...new Set((body.userIds ?? []).map(Number).filter((n) => n > 0)),
          ];
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
          const [first, ...rest] = existing;
          await run(
            `UPDATE challenge_schedule SET target_type = 'user', target_user_id = ? WHERE id = ?`,
            [first.id, row.id]
          );
          const current = await getOne<{ send_at: string; created_by: number | null }>(
            "SELECT send_at, created_by FROM challenge_schedule WHERE id = ?",
            [row.id]
          );
          for (const u of rest) {
            await run(
              `INSERT INTO challenge_schedule (challenge_id, send_at, target_type, target_user_id, created_by)
               VALUES (?, ?, 'user', ?, ?)`,
              [row.challenge_id, current?.send_at ?? null, u.id, current?.created_by ?? null]
            );
          }
        } else {
          await run(
            `UPDATE challenge_schedule SET target_type = ?, target_user_id = NULL WHERE id = ?`,
            [target, row.id]
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
