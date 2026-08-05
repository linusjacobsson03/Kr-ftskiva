import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { run } from "@/lib/db";
import { apiError } from "@/lib/apiError";

/** Cancels a not-yet-sent scheduled send. Scoped to status = 'scheduled' so an already-dispatching/sent one can't be yanked out from under the poller. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/schedule/[id]/cancel">
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const result = await run(
      "UPDATE challenge_schedule SET status = 'canceled' WHERE id = ? AND status = 'scheduled'",
      [id]
    );
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Hittades inte (eller har redan skickats)." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
