import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db, { ChallengeRow, UserRow } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/[id]/send">
) {
  const admin = await getCurrentUser();
  if (!admin) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  if (!admin.is_admin) {
    return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const challenge = db
    .prepare("SELECT * FROM challenges WHERE id = ?")
    .get(id) as ChallengeRow | undefined;
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

  const allUsers = db.prepare("SELECT * FROM users").all() as UserRow[];
  if (allUsers.length === 0) {
    return NextResponse.json({ error: "Inga deltagare än." }, { status: 400 });
  }

  const recipients: UserRow[] =
    target === "random"
      ? [allUsers[Math.floor(Math.random() * allUsers.length)]]
      : allUsers;

  const insert = db.prepare(
    `INSERT INTO challenge_assignments (challenge_id, user_id, deadline)
     VALUES (?, ?, datetime('now', '+' || ? || ' seconds'))`
  );

  const assignedIds: number[] = [];
  const tx = db.transaction((users: UserRow[]) => {
    for (const u of users) {
      const result = insert.run(challenge.id, u.id, challenge.duration_seconds);
      assignedIds.push(Number(result.lastInsertRowid));
    }
  });
  tx(recipients);

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
}
