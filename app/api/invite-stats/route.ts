import { NextResponse } from "next/server";
import { userCount } from "@/lib/db";
import { apiError } from "@/lib/apiError";

/**
 * Public, unauthenticated: just a headcount for the welcome/RSVP page, so
 * nobody needs to be logged in to see "X har redan tackat ja" before they've
 * even created an account.
 */
export async function GET() {
  try {
    const attending = await userCount();
    return NextResponse.json({ attending });
  } catch (err) {
    return apiError(err);
  }
}
