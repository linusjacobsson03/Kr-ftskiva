import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { apiError } from "@/lib/apiError";

/**
 * Rejects a *pending* suggestion by deleting it outright — pending
 * challenges never had assignments sent, so there's nothing else
 * referencing the row. Scoped to status = 'pending' so this can't be used
 * to silently delete an already-approved (possibly already-sent) challenge.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/challenges/[id]/reject">
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
    const result = await run("DELETE FROM challenges WHERE id = ? AND status = 'pending'", [id]);
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Utmaningen hittades inte (eller är redan godkänd)." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
