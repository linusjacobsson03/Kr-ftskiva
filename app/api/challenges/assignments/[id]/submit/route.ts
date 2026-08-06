import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOne, run, AssignmentRow, ChallengeRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

// Same real ceiling as app/api/photos/route.ts — see the comment there.
const MAX_IMAGE_CHARS = 4_400_000; // ~3.3MB binary

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/assignments/[id]/submit">
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }

    const { id } = await ctx.params;
    const assignment = await getOne<AssignmentRow>(
      "SELECT * FROM challenge_assignments WHERE id = ?",
      [id]
    );

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
      await run("UPDATE challenge_assignments SET status = 'expired' WHERE id = ?", [
        assignment.id,
      ]);
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
    if (imageData.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: "Bilden är för stor." }, { status: 413 });
    }

    const challenge = await getOne<ChallengeRow>("SELECT * FROM challenges WHERE id = ?", [
      assignment.challenge_id,
    ]);
    if (!challenge) {
      return NextResponse.json({ error: "Utmaningen finns inte längre." }, { status: 404 });
    }

    await run(
      `UPDATE challenge_assignments
       SET status = 'completed', photo_data = ?, completed_at = datetime('now'), points_awarded = ?
       WHERE id = ?`,
      [imageData, challenge.points, assignment.id]
    );

    return NextResponse.json({ ok: true, pointsAwarded: challenge.points });
  } catch (err) {
    return apiError(err);
  }
}
