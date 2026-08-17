import { NextResponse } from "next/server";
import { getAdminSession, getCurrentUser } from "@/lib/auth";
import { getAll, run, CHALLENGE_DURATION_SECONDS, toSqliteDatetime, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

const ADMIN_ERROR = "Fel lösenord eller session har gått ut.";
const DAY_START_MIN = 10 * 60;
const DAY_END_MIN = 23 * 60;

function parseHhmm(value: unknown, fallback: number): number {
  const raw = String(value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return fallback;
  const [h, m] = raw.split(":").map(Number);
  const total = h * 60 + m;
  return Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, total));
}

function randomMinutes(count: number, start: number, end: number): number[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const span = hi - lo + 1;
  if (count <= 0) return [];
  if (span <= 0) return Array.from({ length: count }, () => lo);

  const out: number[] = [];
  if (count <= span) {
    const pool = Array.from({ length: span }, (_, i) => lo + i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    out.push(...pool.slice(0, count));
  } else {
    for (let i = 0; i < count; i++) {
      out.push(lo + Math.floor(Math.random() * span));
    }
  }
  return out.sort((a, b) => a - b);
}

function parseBulkLine(line: string, defaultPoints: number): { title: string; points: number } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const withPoints = trimmed.match(/^(.*?)\s+([1-5])p?$/i);
  if (withPoints?.[1]?.trim()) {
    return {
      title: withPoints[1].trim().slice(0, 120),
      points: Number(withPoints[2]),
    };
  }
  return { title: trimmed.slice(0, 120), points: defaultPoints };
}

function parseDayKey(value: unknown): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(today.getDate() + 4);
  if (date < today) return today;
  if (date > max) return max;
  return date;
}

function minutesToDate(total: number, day: Date): Date {
  const d = new Date(day);
  d.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return d;
}

export async function POST(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: ADMIN_ERROR }, { status: 401 });
    }

    let body: {
      titles?: unknown;
      points?: number;
      target?: string;
      userIds?: number[];
      fromTime?: unknown;
      toTime?: unknown;
      day?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
    }

    const defaultPoints = Math.max(1, Math.min(5, Number(body.points) || 1));
    const rawLines = Array.isArray(body.titles)
      ? body.titles.map((t) => String(t ?? ""))
      : [];
    const items: { title: string; points: number }[] = [];
    const seen = new Set<string>();
    for (const line of rawLines) {
      const parsed = parseBulkLine(line, defaultPoints);
      if (!parsed || seen.has(parsed.title.toLowerCase())) continue;
      seen.add(parsed.title.toLowerCase());
      items.push(parsed);
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Skriv minst en utmaning." }, { status: 400 });
    }
    if (items.length > 80) {
      return NextResponse.json({ error: "Max 80 utmaningar åt gången." }, { status: 400 });
    }
    const target = body.target === "all" || body.target === "user" ? body.target : "random";
    const createdBy = (await getCurrentUser())?.id ?? null;

    let userIds: number[] = [];
    if (target === "user") {
      userIds = [...new Set((body.userIds ?? []).map(Number).filter((n) => n > 0))];
      if (userIds.length === 0) {
        return NextResponse.json({ error: "Välj minst en person." }, { status: 400 });
      }
      const existing = await getAll<UserRow>(
        `SELECT * FROM users WHERE id IN (${userIds.map(() => "?").join(",")})`,
        userIds
      );
      if (existing.length === 0) {
        return NextResponse.json({ error: "Personerna hittades inte." }, { status: 404 });
      }
      userIds = existing.map((u) => u.id);
    }

    const fromMin = parseHhmm(body.fromTime, 16 * 60);
    const toMin = parseHhmm(body.toTime, 19 * 60);
    const day = parseDayKey(body.day);
    const times = randomMinutes(items.length, fromMin, toMin);
    const scheduled: { title: string; time: string; points: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const { title, points } = items[i];
      const sendAt = minutesToDate(times[i], day);
      const hh = String(sendAt.getHours()).padStart(2, "0");
      const mm = String(sendAt.getMinutes()).padStart(2, "0");
      const suggestedTime = `${hh}:${mm}`;

      const created = await run(
        `INSERT INTO challenges (title, description, points, duration_seconds, emoji, created_by, status, suggested_time)
         VALUES (?, '', ?, ?, '🎯', ?, 'approved', ?)`,
        [title, points, CHALLENGE_DURATION_SECONDS, createdBy, suggestedTime]
      );
      const challengeId = created.lastInsertRowid;
      const sendAtSql = toSqliteDatetime(sendAt);

      if (target === "user") {
        for (const uid of userIds) {
          await run(
            `INSERT INTO challenge_schedule (challenge_id, send_at, target_type, target_user_id, created_by)
             VALUES (?, ?, 'user', ?, ?)`,
            [challengeId, sendAtSql, uid, createdBy]
          );
        }
      } else {
        await run(
          `INSERT INTO challenge_schedule (challenge_id, send_at, target_type, target_user_id, created_by)
           VALUES (?, ?, ?, NULL, ?)`,
          [challengeId, sendAtSql, target, createdBy]
        );
      }

      scheduled.push({ title, time: suggestedTime, points });
    }

    return NextResponse.json({ ok: true, count: scheduled.length, scheduled }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
