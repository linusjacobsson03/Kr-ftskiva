import { NextResponse } from "next/server";
import { ensureLocalDevSession, getCurrentUser, sanitizeUser } from "@/lib/auth";
import { getUserPoints } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET(request: Request) {
  try {
    // Localhost: auto-login so Album upload etc. works without an invite SMS.
    let user = await getCurrentUser();
    if (!user) {
      user = await ensureLocalDevSession(request);
    }
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: { ...sanitizeUser(user), points: await getUserPoints(user.id) },
    });
  } catch (err) {
    return apiError(err);
  }
}
