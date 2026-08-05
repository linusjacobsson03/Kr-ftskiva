import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }

    const subscription = await request.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Ogiltig prenumeration." }, { status: 400 });
    }

    await run(
      `INSERT INTO push_subscriptions (user_id, endpoint, subscription_json)
       VALUES (?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, subscription_json = excluded.subscription_json`,
      [user.id, subscription.endpoint, JSON.stringify(subscription)]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }
    const { endpoint } = await request.json();
    if (endpoint) {
      await run("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?", [
        endpoint,
        user.id,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
