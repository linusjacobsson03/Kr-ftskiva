import { NextResponse } from "next/server";
import { getOne } from "@/lib/db";
import { apiError } from "@/lib/apiError";
import { dataUrlToBinaryResponse } from "@/lib/dataUrl";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/media/evidence/[id]">
) {
  try {
    const { id } = await ctx.params;
    const row = await getOne<{ photo_data: string | null }>(
      "SELECT photo_data FROM challenge_assignments WHERE id = ?",
      [id]
    );
    if (!row?.photo_data) {
      return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
    }
    return dataUrlToBinaryResponse(row.photo_data);
  } catch (err) {
    return apiError(err);
  }
}
