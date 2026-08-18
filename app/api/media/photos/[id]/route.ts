import { NextResponse } from "next/server";
import { getOne } from "@/lib/db";
import { apiError } from "@/lib/apiError";
import { dataUrlToBinaryResponse } from "@/lib/dataUrl";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/media/photos/[id]">
) {
  try {
    const { id } = await ctx.params;
    const photo = await getOne<{ image_data: string }>(
      "SELECT image_data FROM photos WHERE id = ?",
      [id]
    );
    if (!photo?.image_data) {
      return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
    }
    return dataUrlToBinaryResponse(photo.image_data);
  } catch (err) {
    return apiError(err);
  }
}
