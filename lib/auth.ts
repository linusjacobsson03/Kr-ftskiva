import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getOne, getOrCreateSetting, run, UserRow } from "./db";

export const SESSION_COOKIE = "kraftskiva_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — a party weekend and then some

let cachedSecret: Uint8Array | null = null;

async function getSecret(): Promise<Uint8Array> {
  if (cachedSecret) return cachedSecret;
  // Prefer an explicit env var (e.g. when running multiple instances behind
  // a load balancer); otherwise auto-generate one and persist it in the DB
  // so sessions survive restarts without any manual setup.
  const secret =
    process.env.SESSION_SECRET ||
    (await getOrCreateSetting("session_secret", () => randomBytes(32).toString("hex")));
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

export interface SessionPayload {
  userId: number;
  [key: string]: unknown;
}

export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(await getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    if (typeof payload.userId !== "number") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function displayNameOf(user: Pick<UserRow, "first_name" | "last_name">): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

export function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    displayName: displayNameOf(user),
    isAdmin: !!user.is_admin,
    createdAt: user.created_at,
  };
}

/** Reads the session cookie (server components / route handlers) and returns the user row, or null. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await getOne<UserRow>("SELECT * FROM users WHERE id = ?", [payload.userId]);
  return user ?? null;
}

/** True for `next dev` on localhost / 127.0.0.1 — never in production. */
export function isLocalDevHost(request?: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (!request) return true;
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/**
 * On local `next dev`, auto-sign-in so Album/Utmaningar work without an invite link.
 * Uses the first guest in the DB, or creates "Local Dev" if the DB is empty.
 */
export async function ensureLocalDevSession(request: Request): Promise<UserRow | null> {
  if (!isLocalDevHost(request)) return null;

  const existing = await getCurrentUser();
  if (existing) return existing;

  let user = await getOne<UserRow>("SELECT * FROM users ORDER BY id ASC LIMIT 1");
  if (!user) {
    const hash = await bcrypt.hash(randomBytes(16).toString("hex"), 10);
    const result = await run(
      `INSERT INTO users (first_name, last_name, password_hash, avatar_emoji)
       VALUES (?, ?, ?, ?)`,
      ["Local", "Dev", hash, "🦞"]
    );
    user = await getOne<UserRow>("SELECT * FROM users WHERE id = ?", [
      Number(result.lastInsertRowid),
    ]);
  }
  if (!user) return null;

  const token = await createSessionToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions);
  return user;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

/** Trims and collapses internal whitespace — used before storing or matching name parts. */
export function cleanNamePart(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * The admin area (/admin) is gated by a single shared passcode, not by
 * whether the visitor happens to be logged into a particular party-guest
 * account — anyone who knows the passcode can manage challenges, whether or
 * not they're also logged in as a regular user. This is intentionally
 * separate from the per-user session above.
 */
export const ADMIN_SESSION_COOKIE = "kraftskiva_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * Falls back to a random passcode stashed in the DB (like the session
 * secret) so the app works out of the box with zero config — only used
 * when ADMIN_PASSCODE isn't set at all.
 */
async function getGeneratedPasscodeHash(): Promise<string> {
  return getOrCreateSetting("admin_passcode_hash", () =>
    bcrypt.hashSync(randomBytes(9).toString("base64url"), 10)
  );
}

/** Length of the numeric admin PIN (from ADMIN_PASSCODE). Defaults to 4. */
export function getAdminPasscodeLength(): number {
  const raw = process.env.ADMIN_PASSCODE?.trim() ?? "";
  if (/^\d{4,8}$/.test(raw)) return raw.length;
  return 4;
}
/** True when ADMIN_PASSCODE is set — exposed (not the value) via /api/admin/session. */
export function hasConfiguredAdminPasscode(): boolean {
  return !!process.env.ADMIN_PASSCODE?.trim();
}

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  // ADMIN_PASSCODE always wins when set, checked fresh on every call rather
  // than only the first time this ever ran. Env vars are commonly added or
  // changed *after* a project's first deploy — a one-time seed would silently
  // keep honoring whatever random passcode got generated before ADMIN_PASSCODE
  // was set, with no obvious way to tell that's what's happening.
  //
  // Trimmed on both sides: pasting a passcode into Vercel's env var UI (or a
  // phone keyboard) very easily picks up a trailing space/newline, which
  // would otherwise fail an exact match with no visible reason why.
  if (hasConfiguredAdminPasscode()) {
    return passcode.trim() === process.env.ADMIN_PASSCODE!.trim();
  }
  const hash = await getGeneratedPasscodeHash();
  return bcrypt.compare(passcode, hash);
}

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE_SECONDS}s`)
    .sign(await getSecret());
}

/** Reads the admin-session cookie and reports whether the passcode has been unlocked. */
export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    return payload.admin === true;
  } catch {
    return false;
  }
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
