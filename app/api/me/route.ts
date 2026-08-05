import { NextResponse } from "next/server";
import { getCurrentUser, sanitizeUser } from "@/lib/auth";
import { getUserPoints } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET() {
  try {
    const user = await getCurrentUser();
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
