import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db, { AssignmentRow, ChallengeRow } from "@/lib/db";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/assignments/[id]/submit">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const assignment = db
    .prepare("SELECT * FROM challenge_assignments WHERE id = ?")
    .get(id) as AssignmentRow | undefined;

  if (!assignment || assignment.user_id !== user.id) {
    return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
  }

  if (assignment.status !== "pending") {
    return NextResponse.json(
      { error: "Den här utmaningen är redan avklarad eller har gått ut." },
      { status: 409 }
    );
  }

  const now = new Date();
  // Stored via sqlite's datetime('now', ...) as UTC "YYYY-MM-DD HH:MM:SS".
  const deadline = new Date(assignment.deadline.replace(" ", "T") + "Z");
  if (now > deadline) {
    db.prepare(
      "UPDATE challenge_assignments SET status = 'expired' WHERE id = ?"
    ).run(assignment.id);
    return NextResponse.json({ error: "Tiden är tyvärr ute!" }, { status: 410 });
  }

  let body: { imageData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }
  const imageData = (body.imageData ?? "").toString();
  if (!imageData.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "Bildbevis krävs för att klara utmaningen." },
      { status: 400 }
    );
  }

  const challenge = db
    .prepare("SELECT * FROM challenges WHERE id = ?")
    .get(assignment.challenge_id) as ChallengeRow;

  db.prepare(
    `UPDATE challenge_assignments
     SET status = 'completed', photo_data = ?, completed_at = datetime('now'), points_awarded = ?
     WHERE id = ?`
  ).run(imageData, challenge.points, assignment.id);

  return NextResponse.json({ ok: true, pointsAwarded: challenge.points });
}
