import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOne, run, AssignmentRow, ChallengeRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";
import { readUploadedMedia } from "@/lib/readUploadedMedia";

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
    const deadline = new Date(assignment.deadline.replace(" ", "T") + "Z");
    if (now > deadline) {
      await run("UPDATE challenge_assignments SET status = 'expired' WHERE id = ?", [
        assignment.id,
      ]);
      return NextResponse.json({ error: "Tiden är tyvärr ute!" }, { status: 410 });
    }

    const media = await readUploadedMedia(request);
    if (!media.ok) {
      return NextResponse.json(
        {
          error:
            media.error === "Ingen bild eller video hittades."
              ? "Bild- eller videobevis krävs för att klara utmaningen."
              : media.error,
        },
        { status: media.status }
      );
    }

    const challenge = await getOne<ChallengeRow>("SELECT * FROM challenges WHERE id = ?", [
      assignment.challenge_id,
    ]);
    if (!challenge) {
      return NextResponse.json({ error: "Utmaningen finns inte längre." }, { status: 404 });
    }

    await run(
      `UPDATE challenge_assignments
       SET status = 'completed', photo_data = ?, completed_at = datetime('now'),
           points_awarded = ?, is_mirrored = ?
       WHERE id = ?`,
      [media.imageData, challenge.points, media.mirrored ? 1 : 0, assignment.id]
    );

    return NextResponse.json({ ok: true, pointsAwarded: challenge.points });
  } catch (err) {
    return apiError(err);
  }
}
