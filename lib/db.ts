import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// SQLite database stored on disk under /data so it survives rebuilds when
// deployed with a persistent volume. Falls back gracefully if the folder
// doesn't exist yet.
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "kraftskiva.db");

declare global {
  var __kraftskivaDb: Database.Database | undefined;
}

// Reuse the connection across hot-reloads in dev.
const db = global.__kraftskivaDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") {
  global.__kraftskivaDb = db;
}

// A generous busy timeout avoids SQLITE_BUSY errors when multiple processes
// (e.g. Next.js build workers, or dev + a script) touch the DB at once.
db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    avatar_emoji TEXT NOT NULL DEFAULT '🦞',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    subscription_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT NOT NULL DEFAULT '',
    image_data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 10,
    duration_seconds INTEGER NOT NULL DEFAULT 120,
    emoji TEXT NOT NULL DEFAULT '🎯',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenge_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | expired
    photo_data TEXT,
    completed_at TEXT,
    points_awarded INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_assignments_user ON challenge_assignments(user_id);
  CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export default db;

// ---------- Types ----------

export interface UserRow {
  id: number;
  username: string;
  display_name: string;
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

export function userCount(): number {
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  return row.c;
}

/**
 * Simple persisted key/value settings, used to auto-generate and remember
 * secrets (session signing key, VAPID push keys) so the app works out of the
 * box without any manual .env setup, while still respecting env var
 * overrides where callers want them.
 */
export function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function getOrCreateSetting(key: string, create: () => string): string {
  const existing = getSetting(key);
  if (existing) return existing;
  const value = create();
  setSetting(key, value);
  return value;
}

export function getUserPoints(userId: number): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(points_awarded), 0) as total FROM challenge_assignments WHERE user_id = ? AND status = 'completed'"
    )
    .get(userId) as { total: number };
  return row.total;
}

/** Marks any pending assignments whose deadline has passed as expired. Cheap, called on read paths. */
export function expireOverdueAssignments(): void {
  db.prepare(
    `UPDATE challenge_assignments
     SET status = 'expired'
     WHERE status = 'pending' AND deadline < datetime('now')`
  ).run();
}
