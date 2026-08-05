import { NextResponse } from "next/server";
import { getCurrentUser, displayNameOf } from "@/lib/auth";
import { getAll, UserRow } from "@/lib/db";
import { apiError } from "@/lib/apiError";

/** Admin-only list of participants, for the "skicka till specifik person" picker. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
    }
    if (!user.is_admin) {
      return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
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
