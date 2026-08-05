import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

/**
 * Database access for Kräftskiva.
 *
 * Uses libSQL, which speaks plain SQLite. Locally (or anywhere without
 * TURSO_DATABASE_URL set) it transparently opens a local file — zero setup.
 * In production, set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to a free Turso
 * database (https://turso.tech) and the exact same code talks to that
 * hosted, persistent database instead. See README.md for setup.
 */

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const localDbPath = process.env.DATABASE_PATH || path.join(dataDir, "kraftskiva.db");

declare global {
  var __kraftskivaClient: Client | undefined;
  var __kraftskivaReady: Promise<void> | undefined;
}

const client: Client =
  global.__kraftskivaClient ??
  (process.env.TURSO_DATABASE_URL
    ? createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
    : createClient({ url: `file:${localDbPath}` }));

if (process.env.NODE_ENV !== "production") {
  global.__kraftskivaClient = client;
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
];

function initSchema(): Promise<void> {
  return client.migrate(SCHEMA_STATEMENTS).then(() => undefined);
}

const ready: Promise<void> = global.__kraftskivaReady ?? initSchema();
if (process.env.NODE_ENV !== "production") {
  global.__kraftskivaReady = ready;
}

type SqlArg = string | number | boolean | null | undefined;

export async function getAll<T = Record<string, unknown>>(
  sql: string,
  args: SqlArg[] = []
): Promise<T[]> {
  await ready;
  const res = await client.execute({ sql, args: args as (string | number | boolean | null)[] });
  return res.rows as unknown as T[];
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
  await ready;
  const res = await client.execute({ sql, args: args as (string | number | boolean | null)[] });
  return { lastInsertRowid: Number(res.lastInsertRowid ?? 0), changes: res.rowsAffected };
}

/** Runs several statements atomically (all-or-nothing) in one round trip. */
export async function runBatch(
  statements: { sql: string; args?: SqlArg[] }[]
): Promise<void> {
  await ready;
  if (statements.length === 0) return;
  await client.batch(
    statements.map((s) => ({ sql: s.sql, args: (s.args ?? []) as (string | number | boolean | null)[] })),
    "write"
  );
}

export default client;

// ---------- Types ----------

export interface UserRow {
  id: number;
  first_name: string;
  last_name: string;
  password_hash: string;
  is_admin: number;
  avatar_emoji: string;
  created_at: string;
}

export interface PhotoRow {
  id: number;
  user_id: number;
  caption: string;
  image_data: string;
  created_at: string;
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
