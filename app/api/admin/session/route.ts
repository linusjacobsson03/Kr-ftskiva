import { NextResponse } from "next/server";
import { getAdminSession, hasConfiguredAdminPasscode, getAdminPasscodeLength } from "@/lib/auth";
import { apiError } from "@/lib/apiError";

/**
 * Lets the client check whether this browser already has the admin area
 * unlocked, without prompting for the passcode again. Also reports whether
 * ADMIN_PASSCODE is configured at all (not its value) — purely a
 * troubleshooting aid for "I set it in Vercel but it still says wrong
 * password", which is almost always a missing redeploy or the variable
 * being scoped to Preview/Development instead of Production.
 */
export async function GET() {
  try {
    const unlocked = await getAdminSession();
    return NextResponse.json({
      unlocked,
      passcodeConfigured: hasConfiguredAdminPasscode(),
      passcodeLength: getAdminPasscodeLength(),
    });
  } catch (err) {
    return apiError(err);
  }
}
