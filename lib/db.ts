import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

/**
 * Database access for Kräftskiva.
 *
 * Uses libSQL, which speaks plain SQLite. Locally (or anywhere without
 * TURSO_DATABASE_URL set) it transparently opens a local file — zero setup.
 * In production, set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to a free Turso
 * database (https://turso.tech) and the exact same code talks to that
 * hosted, persistent database instead. See README.md for setup.
 *
 * Everything below is built lazily and defensively on purpose: this module
 * is imported by nearly every route (via lib/auth.ts), so if client setup
 * ever threw synchronously at import time, it would take down every route
 * in the app — including ones that never touch the database (e.g. /api/me
 * with no session cookie). Bad/missing Turso credentials should only ever
 * break the specific request that needed the database, with a clear error.
 */

declare global {
  var __kraftskivaClient: Client | undefined;
  var __kraftskivaReady: Promise<void> | undefined;
}

function resolveLocalDbPath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  // Prefer a folder next to the project so it's easy to find in local dev,
  // but fall back to the OS temp dir if that location isn't writable (e.g.
  // an unexpected read-only deployment without Turso configured) so we at
  // least degrade to "works until restart" instead of crashing outright.
  const preferred = path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(preferred, { recursive: true });
    return path.join(preferred, "kraftskiva.db");
  } catch {
    const fallback = path.join(os.tmpdir(), "kraftskiva-data");
    fs.mkdirSync(fallback, { recursive: true });
    return path.join(fallback, "kraftskiva.db");
  }
}

function createDbClient(): Client {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  // A generous busy timeout avoids SQLITE_BUSY errors when multiple
  // processes (e.g. Next.js build workers) touch the local file at once.
  // Ignored for remote Turso connections.
  return createClient({ url: `file:${resolveLocalDbPath()}`, timeout: 5000 });
}

function getClient(): Client {
  if (!global.__kraftskivaClient) {
    global.__kraftskivaClient = createDbClient();
  }
  return global.__kraftskivaClient;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    avatar_emoji TEXT NOT NULL DEFAULT '🦞',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_name ON users(first_name, last_name)`,

  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    subscription_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT NOT NULL DEFAULT '',
    image_data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 10,
    duration_seconds INTEGER NOT NULL DEFAULT 120,
    emoji TEXT NOT NULL DEFAULT '🎯',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS challenge_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    photo_data TEXT,
    completed_at TEXT,
    points_awarded INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE INDEX IF NOT EXISTS idx_assignments_user ON challenge_assignments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at)`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS challenge_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    send_at TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'random',
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'scheduled',
    error TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_due ON challenge_schedule(status, send_at)`,
];

/**
 * Adds a column to an existing table if it isn't there yet. Plain
 * `ALTER TABLE ADD COLUMN` isn't idempotent like `CREATE TABLE IF NOT
 * EXISTS`, so this checks first — safe to call on every boot, existing rows
 * get the column's default, i.e. rows created before a given feature existed
 * stay visible/usable exactly as before.
 */
async function ensureColumn(table: string, column: string, ddl: string): Promise<void> {
  const client = getClient();
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const hasColumn = info.rows.some(
    (row) => (row as unknown as { name: string }).name === column
  );
  if (!hasColumn) {
    await client.execute(ddl);
  }
}

async function ensureMigrations(): Promise<void> {
  await ensureColumn(
    "challenges",
    "status",
    `ALTER TABLE challenges ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`
  );
  await ensureColumn(
    "challenges",
    "suggested_time",
    `ALTER TABLE challenges ADD COLUMN suggested_time TEXT`
  );
  // Unique magic-link token per guest — admin creates the account, SMS
  // carries the link, opening it logs them in (no self-registration).
  await ensureColumn("users", "invite_token", `ALTER TABLE users ADD COLUMN invite_token TEXT`);
  await ensureColumn(
    "users",
    "rsvp_status",
    `ALTER TABLE users ADD COLUMN rsvp_status TEXT`
  );
  // SQLite UNIQUE allows multiple NULLs, so this only enforces uniqueness
  // among real invite tokens.
  await getClient().execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token)`
  );
  await ensureColumn(
    "photos",
    "is_mirrored",
    `ALTER TABLE photos ADD COLUMN is_mirrored INTEGER NOT NULL DEFAULT 0`
  );
  await ensureColumn(
    "challenge_assignments",
    "is_mirrored",
    `ALTER TABLE challenge_assignments ADD COLUMN is_mirrored INTEGER NOT NULL DEFAULT 0`
  );
}

function getReady(): Promise<void> {
  if (!global.__kraftskivaReady) {
    global.__kraftskivaReady = getClient()
      .migrate(SCHEMA_STATEMENTS)
      .then(() => ensureMigrations())
      .then(() => undefined)
      .catch((err) => {
        // Let the next call try again instead of permanently caching a failure.
        global.__kraftskivaReady = undefined;
        throw wrapDbError(err);
      });
  }
  return global.__kraftskivaReady;
}

/** Adds a clear, actionable message on top of raw libSQL/network errors. */
function wrapDbError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const usingTurso = !!process.env.TURSO_DATABASE_URL;
  const hint = usingTurso
    ? "Kunde inte nå Turso-databasen. Kontrollera att TURSO_DATABASE_URL och TURSO_AUTH_TOKEN är korrekt satta (utan citattecken) och att appen har byggts om efter att de lades till."
    : "Kunde inte öppna den lokala databasfilen.";
  const wrapped = new Error(`${hint} (${message})`);
  wrapped.cause = err;
  return wrapped;
}

type SqlArg = string | number | boolean | null | undefined;

export async function getAll<T = Record<string, unknown>>(
  sql: string,
  args: SqlArg[] = []
): Promise<T[]> {
  await getReady();
  try {
    const res = await getClient().execute({
      sql,
      args: args as (string | number | boolean | null)[],
    });
    return res.rows as unknown as T[];
  } catch (err) {
    throw wrapDbError(err);
  }
}

export async function getOne<T = Record<string, unknown>>(
  sql: string,
  args: SqlArg[] = []
): Promise<T | undefined> {
  const rows = await getAll<T>(sql, args);
  return rows[0];
}

export async function run(
  sql: string,
  args: SqlArg[] = []
): Promise<{ lastInsertRowid: number; changes: number }> {
  await getReady();
  try {
    const res = await getClient().execute({
      sql,
      args: args as (string | number | boolean | null)[],
    });
    return { lastInsertRowid: Number(res.lastInsertRowid ?? 0), changes: res.rowsAffected };
  } catch (err) {
    throw wrapDbError(err);
  }
}

/** Runs several statements atomically (all-or-nothing) in one round trip. */
export async function runBatch(
  statements: { sql: string; args?: SqlArg[] }[]
): Promise<void> {
  await getReady();
  if (statements.length === 0) return;
  try {
    await getClient().batch(
      statements.map((s) => ({
        sql: s.sql,
        args: (s.args ?? []) as (string | number | boolean | null)[],
      })),
      "write"
    );
  } catch (err) {
    throw wrapDbError(err);
  }
}

// ---------- Types ----------

export interface UserRow {
  id: number;
  first_name: string;
  last_name: string;
  password_hash: string;
  is_admin: number;
  avatar_emoji: string;
  created_at: string;
  invite_token: string | null;
  rsvp_status: "yes" | "maybe" | "no" | null;
}

export interface PhotoRow {
  id: number;
  user_id: number;
  caption: string;
  image_data: string;
  created_at: string;
  is_mirrored: number;
}

export interface ChallengeRow {
  id: number;
  title: string;
  description: string;
  points: number;
  duration_seconds: number;
  emoji: string;
  created_by: number | null;
  created_at: string;
  status: "pending" | "approved";
  suggested_time: string | null;
}

export interface ScheduleRow {
  id: number;
  challenge_id: number;
  send_at: string;
  target_type: "random" | "all" | "user";
  target_user_id: number | null;
  status: "scheduled" | "sending" | "sent" | "canceled" | "failed";
  error: string | null;
  created_by: number | null;
  created_at: string;
  sent_at: string | null;
}

export interface AssignmentRow {
  id: number;
  challenge_id: number;
  user_id: number;
  assigned_at: string;
  deadline: string;
  status: "pending" | "completed" | "expired";
  photo_data: string | null;
  completed_at: string | null;
  points_awarded: number;
  is_mirrored: number;
}

/** Every challenge gets the same 5-minute window to submit photo proof. */
export const CHALLENGE_DURATION_SECONDS = 300;

/**
 * Formats a JS Date as sqlite's `datetime('now')` does — UTC,
 * "YYYY-MM-DD HH:MM:SS", no offset/fractional seconds — so a stored value
 * can be compared with `<=` against `datetime('now')` in SQL. (Other
 * timestamps in this app are produced directly in SQL; this one starts as a
 * JS Date from the admin's time picker, so it needs converting here.)
 */
export function toSqliteDatetime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function userCount(): Promise<number> {
  const row = await getOne<{ c: number }>("SELECT COUNT(*) as c FROM users");
  return row?.c ?? 0;
}

/**
 * Simple persisted key/value settings, used to auto-generate and remember
 * secrets (session signing key, VAPID push keys) so the app works out of the
 * box without any manual .env setup, while still respecting env var
 * overrides where callers want them.
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await getOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

export async function getOrCreateSetting(
  key: string,
  create: () => string
): Promise<string> {
  const existing = await getSetting(key);
  if (existing) return existing;
  const value = create();
  await setSetting(key, value);
  return value;
}

export async function getUserPoints(userId: number): Promise<number> {
  const row = await getOne<{ total: number }>(
    "SELECT COALESCE(SUM(points_awarded), 0) as total FROM challenge_assignments WHERE user_id = ? AND status = 'completed'",
    [userId]
  );
  return row?.total ?? 0;
}

/** Marks any pending assignments whose deadline has passed as expired. Cheap, called on read paths. */
export async function expireOverdueAssignments(): Promise<void> {
  await run(
    `UPDATE challenge_assignments
     SET status = 'expired'
     WHERE status = 'pending' AND deadline < datetime('now')`
  );
}
