import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getOne, run, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: remove a guest account. */
export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    const { id: rawId } = await ctx.params;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Ogiltigt id." }, { status: 400 });
    }

    const existing = await getOne<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ error: "Gästen hittades inte." }, { status: 404 });
    }

    await run("DELETE FROM users WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err, "Kunde inte ta bort gästen.");
  }
}
