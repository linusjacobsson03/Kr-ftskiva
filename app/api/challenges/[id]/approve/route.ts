import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOne, run, ChallengeRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/[id]/approve">
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

    await run("UPDATE challenges SET status = 'approved' WHERE id = ?", [id]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
