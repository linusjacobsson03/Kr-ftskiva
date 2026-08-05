import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db, { userCount, UserRow } from "@/lib/db";
import {
  createSessionToken,
  sanitizeUser,
  sessionCookieOptions,
  SESSION_COOKIE,
  normalizeUsername,
} from "@/lib/auth";

const AVATAR_EMOJIS = ["🦞", "🦀", "🎉", "🌙", "🍺", "⭐", "🎈", "🥳", "🦐", "🌊"];

export async function POST(request: Request) {
  let body: { username?: string; password?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }

  const rawUsername = (body.username ?? "").toString();
  const password = (body.password ?? "").toString();
  const displayName = (body.displayName ?? rawUsername).toString().trim().slice(0, 40);

  const username = normalizeUsername(rawUsername);

  if (username.length < 2 || username.length > 24) {
    return NextResponse.json(
      { error: "Användarnamnet måste vara 2–24 tecken." },
      { status: 400 }
    );
  }
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return NextResponse.json(
      { error: "Använd bara bokstäver, siffror, _ . eller - i användarnamnet." },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Lösenordet måste vara minst 4 tecken." },
      { status: 400 }
    );
  }
  if (!displayName) {
    return NextResponse.json({ error: "Ange ett namn." }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) {
    return NextResponse.json(
      { error: "Användarnamnet är upptaget, välj ett annat." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isFirstUser = userCount() === 0;
  const avatarEmoji =
    AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

  const result = db
    .prepare(
      `INSERT INTO users (username, display_name, password_hash, is_admin, avatar_emoji)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(username, displayName, passwordHash, isFirstUser ? 1 : 0, avatarEmoji);

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(result.lastInsertRowid) as UserRow;

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
