import { NextResponse } from "next/server";

/** Turns a stored `data:...;base64,...` value into a binary HTTP response. */
export function dataUrlToBinaryResponse(dataUrl: string): NextResponse {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: "Ogiltig media." }, { status: 500 });
  }
  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

export function isStoredVideo(dataUrl: string | null | undefined): boolean {
  return Boolean(dataUrl?.startsWith("data:video/"));
}
