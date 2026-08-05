/**
 * Runs once when the Next.js server process starts (see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md).
 * Used here to boot the in-process challenge-schedule poller instead of the
 * observability hookup this file is usually meant for — see
 * lib/scheduler.ts for what it does and its limits on serverless hosts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
