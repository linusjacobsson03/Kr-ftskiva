import { NextResponse } from "next/server";
import {
  createSessionToken,
  displayNameOf,
  SESSION_COOKIE,
  sessionCookieOptions,
  sanitizeUser,
} from "@/lib/auth";
import { getOne, run, UserRow, getSetting } from "@/lib/db";
import { apiError } from "@/lib/apiError";

type Ctx = { params: Promise<{ token: string }> };

function validToken(token: string | undefined): token is string {
  return !!token && token.length >= 8 && token.length <= 80;
}

async function partyLive(): Promise<boolean> {
  return (await getSetting("party_live")) === "1";
}

/** Public: resolve a personal invite link to the guest's name (no secrets). */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!validToken(token)) {
      return NextResponse.json({ error: "Ogiltig inbjudan." }, { status: 404 });
    }

    const user = await getOne<UserRow>("SELECT * FROM users WHERE invite_token = ?", [
      token,
    ]);
    if (!user) {
      return NextResponse.json({ error: "Inbjudan hittades inte." }, { status: 404 });
    }

    return NextResponse.json({
      firstName: user.first_name,
      displayName: displayNameOf(user),
      rsvpStatus: user.rsvp_status,
      partyLive: await partyLive(),
    });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * Claim the invite: create a session for this guest so opening the SMS link
 * both shows their personal invite and logs them into their account.
 * When party mode is on, clients skip the invite UI and go straight to the app.
 */
export async function POST(request: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!validToken(token)) {
      return NextResponse.json({ error: "Ogiltig inbjudan." }, { status: 404 });
    }

    const user = await getOne<UserRow>("SELECT * FROM users WHERE invite_token = ?", [
      token,
    ]);
    if (!user) {
      return NextResponse.json({ error: "Inbjudan hittades inte." }, { status: 404 });
    }

    let rsvpStatus = user.rsvp_status;
    try {
      const body = await request.json();
      const next = body?.rsvpStatus;
      if (next === "yes" || next === "maybe" || next === "no") {
        await run("UPDATE users SET rsvp_status = ? WHERE id = ?", [next, user.id]);
        rsvpStatus = next;
      }
    } catch {
      // empty body is fine — claim-only
    }

    const live = await partyLive();
    const session = await createSessionToken(user.id);
    const response = NextResponse.json({
      user: sanitizeUser(user),
      firstName: user.first_name,
      displayName: displayNameOf(user),
      rsvpStatus,
      partyLive: live,
    });
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
    return response;
  } catch (err) {
    return apiError(err, "Kunde inte öppna inbjudan.");
  }
}
