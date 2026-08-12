import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  getAdminSession,
  displayNameOf,
  cleanNamePart,
  sanitizeUser,
} from "@/lib/auth";
import { getAll, getOne, run, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

const AVATAR_EMOJIS = ["🦞", "🦀", "🎉", "🌙", "🍺", "⭐", "🎈", "🥳", "🦐", "🌊"];
const NAME_PATTERN = /^[\p{L} '.-]+$/u;

function inviteUrlFor(token: string, request: Request): string {
  const origin = new URL(request.url).origin;
  return `${origin}/i/${token}`;
}

function splitName(raw: string): { firstName: string; lastName: string } | null {
  const cleaned = cleanNamePart(raw);
  if (!cleaned) return null;
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/** Admin: list all invited guests with their shareable invite links. */
export async function GET(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    const users = await getAll<UserRow>(
      "SELECT * FROM users ORDER BY created_at DESC, first_name, last_name"
    );

    return NextResponse.json({
      guests: users.map((u) => ({
        ...sanitizeUser(u),
        inviteToken: u.invite_token,
        inviteUrl: u.invite_token ? inviteUrlFor(u.invite_token, request) : null,
        rsvpStatus: u.rsvp_status,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

/** Admin: create a guest account + unique invite link (no self-registration). */
export async function POST(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    let body: { name?: string; firstName?: string; lastName?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    let firstName = cleanNamePart((body.firstName ?? "").toString());
    let lastName = cleanNamePart((body.lastName ?? "").toString());

    if (!firstName && body.name) {
      const split = splitName(body.name.toString());
      if (!split) {
        return NextResponse.json({ error: "Ange ett namn." }, { status: 400 });
      }
      firstName = split.firstName;
      lastName = split.lastName;
    }

    if (firstName.length < 1 || firstName.length > 40) {
      return NextResponse.json(
        { error: "Ange ett förnamn (max 40 tecken)." },
        { status: 400 }
      );
    }
    if (!NAME_PATTERN.test(firstName)) {
      return NextResponse.json(
        { error: "Namnet får bara innehålla bokstäver." },
        { status: 400 }
      );
    }
    if (lastName.length > 40) {
      return NextResponse.json(
        { error: "Efternamnet får vara max 40 tecken." },
        { status: 400 }
      );
    }
    if (lastName && !NAME_PATTERN.test(lastName)) {
      return NextResponse.json(
        { error: "Efternamnet får bara innehålla bokstäver." },
        { status: 400 }
      );
    }

    // Guests never set a password — login is via the invite magic link.
    // Store a random hash so the column stays NOT NULL and password login fails.
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    const inviteToken = randomBytes(18).toString("base64url");
    const avatarEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

    const result = await run(
      `INSERT INTO users (first_name, last_name, password_hash, is_admin, avatar_emoji, invite_token)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [firstName, lastName, passwordHash, avatarEmoji, inviteToken]
    );

    const user = await getOne<UserRow>("SELECT * FROM users WHERE id = ?", [
      result.lastInsertRowid,
    ]);
    if (!user) {
      return NextResponse.json({ error: "Något gick fel, testa igen." }, { status: 500 });
    }

    return NextResponse.json(
      {
        guest: {
          ...sanitizeUser(user),
          inviteToken: user.invite_token,
          inviteUrl: inviteUrlFor(inviteToken, request),
          rsvpStatus: user.rsvp_status,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err, "Kunde inte skapa gästen, testa igen.");
  }
}
