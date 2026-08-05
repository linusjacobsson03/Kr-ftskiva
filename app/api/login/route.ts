import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db, { UserRow } from "@/lib/db";
import {
  createSessionToken,
  sanitizeUser,
  sessionCookieOptions,
  SESSION_COOKIE,
  normalizeUsername,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }

  const username = normalizeUsername((body.username ?? "").toString());
  const password = (body.password ?? "").toString();

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;

  if (!user) {
    return NextResponse.json(
      { error: "Fel användarnamn eller lösenord." },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Fel användarnamn eller lösenord." },
      { status: 401 }
    );
  }

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({ user: sanitizeUser(user) });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
