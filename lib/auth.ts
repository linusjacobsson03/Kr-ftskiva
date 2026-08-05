import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import db, { UserRow, getOrCreateSetting } from "./db";

export const SESSION_COOKIE = "kraftskiva_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — a party weekend and then some

function getSecret(): Uint8Array {
  // Prefer an explicit env var (e.g. when running multiple instances behind
  // a load balancer); otherwise auto-generate one and persist it in the DB
  // so sessions survive restarts without any manual setup.
  const secret =
    process.env.SESSION_SECRET ||
    getOrCreateSetting("session_secret", () => randomBytes(32).toString("hex"));
  return new TextEncoder().encode(secret);
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
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "number") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    isAdmin: !!user.is_admin,
    avatarEmoji: user.avatar_emoji,
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
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(payload.userId) as UserRow | undefined;
  return user ?? null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}
