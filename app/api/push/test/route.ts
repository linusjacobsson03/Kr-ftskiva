import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll } from "@/lib/db";
import { sendPushToUser, type PushSubscriptionRow } from "@/lib/push";
import { apiError } from "@/lib/apiError";

/** Logged-in user: confirm server has their subscription + send a test push. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }
    const subs = await getAll<PushSubscriptionRow>(
      "SELECT id, endpoint FROM push_subscriptions WHERE user_id = ?",
      [user.id]
    );
    return NextResponse.json({
      ok: true,
      userId: user.id,
      pushEnabled: subs.length > 0,
      subscriptions: subs.length,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }

    const result = await sendPushToUser(user.id, {
      title: "Testnotis från Kräftskiva",
      body: "Om du ser det här funkar notiser på den här telefonen.",
      url: "/challenges",
      tag: "kraftskiva-test",
    });

    if (result.attempted === 0 || result.delivered === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Kunde inte leverera testnotis.",
          ...result,
        },
        { status: result.attempted === 0 ? 400 : 502 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return apiError(err, "Kunde inte skicka testnotis.");
  }
}
