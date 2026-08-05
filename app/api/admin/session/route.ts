import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { apiError } from "@/lib/apiError";

/** Lets the client check whether this browser already has the admin area unlocked, without prompting for the passcode again. */
export async function GET() {
  try {
    const unlocked = await getAdminSession();
    return NextResponse.json({ unlocked });
  } catch (err) {
    return apiError(err);
  }
}
