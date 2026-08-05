import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getOne, run, ChallengeRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/[id]/approve">
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

    await run("UPDATE challenges SET status = 'approved' WHERE id = ?", [id]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
