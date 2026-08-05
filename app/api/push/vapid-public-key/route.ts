import { NextResponse } from "next/server";
import { getPublicVapidKey } from "@/lib/push";
import { apiError } from "@/lib/apiError";

export async function GET() {
  try {
    return NextResponse.json({ publicKey: await getPublicVapidKey() });
  } catch (err) {
    return apiError(err);
  }
}
