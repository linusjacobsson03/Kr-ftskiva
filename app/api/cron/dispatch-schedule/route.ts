import { NextResponse } from "next/server";
import { dispatchDueSchedules } from "@/lib/scheduler";
import { apiError } from "@/lib/apiError";

/**
 * Safety net for scheduled challenge sends on serverless hosts (Vercel),
 * which have no long-lived process for lib/scheduler.ts's setInterval
 * poller to run in. /api/challenges/active and /api/schedule already
 * trigger a dispatch pass opportunistically on every poll from a phone with
 * the app open — that covers the common case (someone's always got the app
 * open during the party) within a few seconds. This route exists for the
 * gap case: a challenge scheduled for a moment when literally nobody has
 * the app open. Wired up as a Vercel Cron job in vercel.json.
 *
 * Protected with CRON_SECRET so it can't be used by randoms to spam-trigger
 * dispatch — Vercel's own cron caller sends this same bearer token
 * automatically (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * Without CRON_SECRET set, the route still works (falls back to open) so
 * this doesn't become a "why doesn't scheduling work" footgun for a fresh
 * setup — set it once you want the endpoint locked down.
 */
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }
    await dispatchDueSchedules();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
