import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAll, getOne, runBatch, ChallengeRow, UserRow } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { apiError } from "@/lib/apiError";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/[id]/send">
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

    let body: { target?: "all" | "random" };
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const target = body.target === "random" ? "random" : "all";

    const allUsers = await getAll<UserRow>("SELECT * FROM users");
    if (allUsers.length === 0) {
      return NextResponse.json({ error: "Inga deltagare än." }, { status: 400 });
    }

    const recipients: UserRow[] =
      target === "random"
        ? [allUsers[Math.floor(Math.random() * allUsers.length)]]
        : allUsers;

    await runBatch(
      recipients.map((u) => ({
        sql: `INSERT INTO challenge_assignments (challenge_id, user_id, deadline)
              VALUES (?, ?, datetime('now', '+' || ? || ' seconds'))`,
        args: [challenge.id, u.id, challenge.duration_seconds],
      }))
    );

    const minutes = Math.round(challenge.duration_seconds / 60);
    const timeLabel =
      challenge.duration_seconds % 60 === 0
        ? `${minutes} min`
        : `${challenge.duration_seconds} sek`;

    await Promise.all(
      recipients.map((u) =>
        sendPushToUser(u.id, {
          title: `${challenge.emoji} Ny utmaning!`,
          body: `${challenge.title} — du har ${timeLabel} på dig! Bildbevis krävs.`,
          url: "/challenges",
          tag: "kraftskiva-challenge",
        })
      )
    );

    return NextResponse.json({ ok: true, sentTo: recipients.length });
  } catch (err) {
    return apiError(err);
  }
}
