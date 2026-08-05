import { NextResponse } from "next/server";

/**
 * Converts an unexpected error (most commonly a database connection issue)
 * into a proper JSON response. Without this, an uncaught error in a route
 * handler results in a bare empty 500 from the platform, which the client
 * can't parse — it just sees "kunde inte nå servern" with zero information
 * about what actually went wrong. Always logs server-side too, so the real
 * cause shows up in deployment logs.
 */
export function apiError(err: unknown, fallback = "Något gick fel, försök igen.") {
  console.error(err);
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
