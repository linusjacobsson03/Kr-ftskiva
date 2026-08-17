import { NextResponse } from "next/server";
import {
  verifyAdminPasscode,
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
} from "@/lib/auth";
import { apiError } from "@/lib/apiError";

export async function POST(request: Request) {
  let body: { passcode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }

  const passcode = (body.passcode ?? "").toString();
  if (!passcode) {
    return NextResponse.json({ error: "Ange koden." }, { status: 400 });
  }

  try {
    const ok = await verifyAdminPasscode(passcode);
    if (!ok) {
      return NextResponse.json({ error: "Fel kod." }, { status: 401 });
    }
    const token = await createAdminSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions);
    return response;
  } catch (err) {
    return apiError(err, "Kunde inte låsa upp, testa igen.");
  }
}
