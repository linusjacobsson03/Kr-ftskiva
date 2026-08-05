import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const subscription = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Ogiltig prenumeration." }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, subscription_json)
     VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, subscription_json = excluded.subscription_json`
  ).run(user.id, subscription.endpoint, JSON.stringify(subscription));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const { endpoint } = await request.json();
  if (endpoint) {
    db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").run(
      endpoint,
      user.id
    );
  }
  return NextResponse.json({ ok: true });
}
