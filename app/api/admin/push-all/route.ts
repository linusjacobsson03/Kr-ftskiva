import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";
import { apiError } from "@/lib/apiError";

/** Admin: send a custom push notification to everyone who has opted in. */
export async function POST(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    let body: { title?: string; body?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    const message = (body.body ?? "").toString().trim().slice(0, 240);
    if (!message) {
      return NextResponse.json({ error: "Skriv ett meddelande först." }, { status: 400 });
    }
    const title = (body.title ?? "").toString().trim().slice(0, 80) || "Lilla Brattön";

    const result = await sendPushToAll({
      title,
      body: message,
      url: "/challenges",
      tag: `broadcast-${Date.now()}`,
    });

    if (result.attempted === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Ingen har aktiverat notiser ännu.",
          ...result,
        },
        { status: 400 }
      );
    }

    if (result.delivered === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Kunde inte leverera notisen.",
          ...result,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return apiError(err, "Kunde inte skicka notis.");
  }
}
