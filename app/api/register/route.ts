import { NextResponse } from "next/server";

/** Public self-registration is disabled — guests are created by admin and
 *  enter via their unique /i/<token> invite link. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Konton skapas av värden. Öppna din personliga inbjudningslänk från SMS istället.",
    },
    { status: 403 }
  );
}
