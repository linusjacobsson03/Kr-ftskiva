import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getOne, UserRow } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { apiError } from "@/lib/apiError";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: send a test push to one guest to verify iOS/home-screen notifications. */
export async function POST(_request: Request, ctx: Ctx) {
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

    const user = await getOne<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      return NextResponse.json({ error: "Gästen hittades inte." }, { status: 404 });
    }

    const result = await sendPushToUser(id, {
      title: "Testnotis från Kräftskiva",
      body: "Funkar det här syns notiser på din hemskärmsapp.",
      url: "/challenges",
      tag: "kraftskiva-test",
    });

    if (result.attempted === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.error ||
            "Ingen notisprenumeration sparad för den här personen. Öppna appen från hemskärmen (iPhone) och tryck Aktivera under notiser.",
          ...result,
        },
        { status: 400 }
      );
    }

    if (result.delivered === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.error ||
            "Push misslyckades. Be personen aktivera notiser igen från hemskärmsappen.",
          ...result,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return apiError(err, "Kunde inte skicka testnotis.");
  }
}
