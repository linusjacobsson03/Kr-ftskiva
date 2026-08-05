import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getOne, getOrCreateSetting, UserRow } from "./db";

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
  return `${user.first_name} ${user.last_name}`.trim();
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
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // a party weekend and then some

async function getAdminPasscodeHash(): Promise<string> {
  return getOrCreateSetting("admin_passcode_hash", () => {
    // Prefer an explicit env var; otherwise fall back to a random passcode
    // (like the session secret) rather than shipping a real party's
    // password in the repo. Set ADMIN_PASSCODE in .env.local, or update it
    // once via the running app/DB, to choose your own.
    const seed = process.env.ADMIN_PASSCODE || randomBytes(9).toString("base64url");
    return bcrypt.hashSync(seed, 10);
  });
}

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const hash = await getAdminPasscodeHash();
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
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
};
