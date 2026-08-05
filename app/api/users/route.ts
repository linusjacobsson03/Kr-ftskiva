import { NextResponse } from "next/server";
import { getAdminSession, displayNameOf } from "@/lib/auth";
import { getAll, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

/** Admin-only list of participants, for the "skicka till specifik person" picker. */
export async function GET() {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    const users = await getAll<UserRow>(
      "SELECT * FROM users ORDER BY first_name, last_name"
    );

    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, displayName: displayNameOf(u) })),
    });
  } catch (err) {
    return apiError(err);
  }
}
