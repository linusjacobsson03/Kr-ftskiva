import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { run, userCount, getOne, UserRow } from "@/lib/db";
import {
  createSessionToken,
  sanitizeUser,
  sessionCookieOptions,
  SESSION_COOKIE,
  cleanNamePart,
} from "@/lib/auth";
import { apiError } from "@/lib/apiError";

const AVATAR_EMOJIS = ["🦞", "🦀", "🎉", "🌙", "🍺", "⭐", "🎈", "🥳", "🦐", "🌊"];
const NAME_PATTERN = /^[\p{L} '.-]+$/u;

export async function POST(request: Request) {
  let body: { firstName?: string; lastName?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }

  const firstName = cleanNamePart((body.firstName ?? "").toString());
  const lastName = cleanNamePart((body.lastName ?? "").toString());
  const password = (body.password ?? "").toString();

  for (const [label, value] of [
    ["förnamn", firstName],
    ["efternamn", lastName],
  ] as const) {
    if (value.length < 1 || value.length > 40) {
      return NextResponse.json(
        { error: `Ange ett ${label} (max 40 tecken).` },
        { status: 400 }
      );
    }
    if (!NAME_PATTERN.test(value)) {
      return NextResponse.json(
        { error: `${label[0].toUpperCase()}${label.slice(1)} får bara innehålla bokstäver.` },
        { status: 400 }
      );
    }
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Lösenordet måste vara minst 4 tecken." },
      { status: 400 }
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const isFirstUser = (await userCount()) === 0;
    const avatarEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

    const result = await run(
      `INSERT INTO users (first_name, last_name, password_hash, is_admin, avatar_emoji)
       VALUES (?, ?, ?, ?, ?)`,
      [firstName, lastName, passwordHash, isFirstUser ? 1 : 0, avatarEmoji]
    );

    const user = await getOne<UserRow>("SELECT * FROM users WHERE id = ?", [
      result.lastInsertRowid,
    ]);
    if (!user) {
      return NextResponse.json({ error: "Något gick fel, testa igen." }, { status: 500 });
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (err) {
    return apiError(err, "Kunde inte skapa kontot, testa igen.");
  }
}
