import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAll, UserRow } from "@/lib/db";
import {
  createSessionToken,
  sanitizeUser,
  sessionCookieOptions,
  SESSION_COOKIE,
  cleanNamePart,
} from "@/lib/auth";

const GENERIC_ERROR = "Fel namn eller lösenord.";

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

  if (!firstName || !lastName || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // Names aren't unique (two "Anna Andersson" can both be at the party), so
  // find every account with that name and let the password disambiguate.
  const candidates = await getAll<UserRow>(
    "SELECT * FROM users WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?)",
    [firstName, lastName]
  );

  for (const candidate of candidates) {
    if (await bcrypt.compare(password, candidate.password_hash)) {
      const token = await createSessionToken(candidate.id);
      const response = NextResponse.json({ user: sanitizeUser(candidate) });
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
      return response;
    }
  }

  return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
}
