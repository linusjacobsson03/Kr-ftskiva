import { getAll, run, UserRow } from "./db";
import { sendPushToUser } from "./push";

const POLL_INTERVAL_MS = 15_000;

interface DueScheduleRow {
  id: number;
  challenge_id: number;
  target_type: "random" | "all" | "user";
  target_user_id: number | null;
  title: string;
  emoji: string;
  duration_seconds: number;
}

declare global {
  var __kraftskivaSchedulerStarted: boolean | undefined;
}

let dispatching = false;

/** Finds every due schedule and sends it. Guarded against overlapping runs — a slow poll (e.g. many push sends) won't stack with the next tick. */
export async function dispatchDueSchedules(): Promise<void> {
  if (dispatching) return;
  dispatching = true;
  try {
    const due = await getAll<DueScheduleRow>(
      `SELECT s.id, s.challenge_id, s.target_type, s.target_user_id,
              c.title, c.emoji, c.duration_seconds
       FROM challenge_schedule s
       JOIN challenges c ON c.id = s.challenge_id
       WHERE s.status = 'scheduled' AND s.send_at <= datetime('now')`
    );
    for (const row of due) {
      await dispatchOne(row);
    }
  } catch (err) {
    console.error("[scheduler] poll failed:", err);
  } finally {
    dispatching = false;
  }
}

async function dispatchOne(row: DueScheduleRow): Promise<void> {
  // Claim the row before doing any work — if a slower-than-interval poll
  // somehow overlaps (or a future multi-instance deploy runs two pollers),
  // whichever call loses the race sees changes === 0 and backs off instead
  // of sending the same challenge twice.
  const claim = await run(
    "UPDATE challenge_schedule SET status = 'sending' WHERE id = ? AND status = 'scheduled'",
    [row.id]
  );
  if (claim.changes === 0) return;

  try {
    const allUsers = await getAll<UserRow>("SELECT * FROM users");
    let recipients: UserRow[];
    if (row.target_type === "all") {
      recipients = allUsers;
    } else if (row.target_type === "user") {
      recipients = allUsers.filter((u) => u.id === row.target_user_id);
    } else {
      recipients = allUsers.length
        ? [allUsers[Math.floor(Math.random() * allUsers.length)]]
        : [];
    }

    if (recipients.length === 0) {
      await run("UPDATE challenge_schedule SET status = 'failed', error = ? WHERE id = ?", [
        "Ingen mottagare hittades (t.ex. borttaget konto eller inga deltagare).",
        row.id,
      ]);
      return;
    }

    await Promise.all(
      recipients.map((u) =>
        run(
          `INSERT INTO challenge_assignments (challenge_id, user_id, deadline)
           VALUES (?, ?, datetime('now', '+' || ? || ' seconds'))`,
          [row.challenge_id, u.id, row.duration_seconds]
        )
      )
    );

    const minutes = Math.round(row.duration_seconds / 60);
    const timeLabel =
      row.duration_seconds % 60 === 0 ? `${minutes} min` : `${row.duration_seconds} sek`;

    await Promise.all(
      recipients.map((u) =>
        sendPushToUser(u.id, {
          title: `${row.emoji} Ny utmaning!`,
          body: `${row.title} — du har ${timeLabel} på dig! Bildbevis krävs.`,
          url: "/challenges",
          tag: "kraftskiva-challenge",
        })
      )
    );

    await run("UPDATE challenge_schedule SET status = 'sent', sent_at = datetime('now') WHERE id = ?", [
      row.id,
    ]);
  } catch (err) {
    console.error(`[scheduler] failed to dispatch schedule ${row.id}:`, err);
    await run("UPDATE challenge_schedule SET status = 'failed', error = ? WHERE id = ?", [
      err instanceof Error ? err.message : String(err),
      row.id,
    ]).catch(() => undefined);
  }
}

/**
 * Starts a lightweight in-process poller that fires scheduled challenge
 * sends at their chosen time. Stored on `globalThis` (like the DB client) so
 * dev-server module reloads don't spin up a second interval.
 *
 * This only works as long as the Next.js server process keeps running —
 * fine for `next dev` and for `next start` left running on a laptop for the
 * night (the deployment path this app's README recommends for the actual
 * party). On a serverless platform without a persistent process (e.g.
 * Vercel) this poller won't survive between requests, so scheduled sends
 * wouldn't fire on their own there without an external cron hitting a
 * dispatch endpoint instead.
 */
export function startScheduler(): void {
  if (global.__kraftskivaSchedulerStarted) return;
  global.__kraftskivaSchedulerStarted = true;

  setInterval(() => {
    dispatchDueSchedules().catch((err) => console.error("[scheduler] tick error:", err));
  }, POLL_INTERVAL_MS);

  // Also run one pass shortly after boot so anything due while the server
  // was restarting doesn't sit waiting for the first full interval.
  dispatchDueSchedules().catch((err) => console.error("[scheduler] initial tick error:", err));
}
