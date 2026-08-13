import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/db";
import { apiError } from "@/lib/apiError";

const PARTY_LIVE_KEY = "party_live";

export async function isPartyLive(): Promise<boolean> {
  return (await getSetting(PARTY_LIVE_KEY)) === "1";
}

/** Admin: whether invite links skip the invite page and open the app. */
export async function GET() {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }
    return NextResponse.json({ partyLive: await isPartyLive() });
  } catch (err) {
    return apiError(err);
  }
}

/** Admin: flip party mode on/off before the evening starts. */
export async function POST(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    let body: { partyLive?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    const partyLive = !!body.partyLive;
    await setSetting(PARTY_LIVE_KEY, partyLive ? "1" : "0");
    return NextResponse.json({ partyLive });
  } catch (err) {
    return apiError(err, "Kunde inte uppdatera läget.");
  }
}
