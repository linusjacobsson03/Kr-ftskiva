import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db, { PhotoRow } from "@/lib/db";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/photos/[id]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(id) as
    | PhotoRow
    | undefined;
  if (!photo) {
    return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
  }
  if (photo.user_id !== user.id && !user.is_admin) {
    return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
  }
  db.prepare("DELETE FROM photos WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
