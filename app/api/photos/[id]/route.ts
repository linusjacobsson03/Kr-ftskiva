import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOne, run, PhotoRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/photos/[id]">
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }
    const { id } = await ctx.params;
    const photo = await getOne<PhotoRow>("SELECT * FROM photos WHERE id = ?", [id]);
    if (!photo) {
      return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
    }
    if (photo.user_id !== user.id) {
      return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
    }
    await run("DELETE FROM photos WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
