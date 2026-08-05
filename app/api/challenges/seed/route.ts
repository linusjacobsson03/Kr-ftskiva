import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAll, runBatch } from "@/lib/db";

const DEFAULT_CHALLENGES = [
  {
    title: "Kindpuss-kombo",
    description: "Ta en bild där du pussar någon på kinden.",
    points: 15,
    duration_seconds: 120,
    emoji: "😘",
  },
  {
    title: "Skål för kräftorna!",
    description: "Skåla med minst tre personer – fånga det på bild.",
    points: 15,
    duration_seconds: 120,
    emoji: "🍻",
  },
  {
    title: "Nubbevisan",
    description: "Sjung en snapsvisa tillsammans med minst två andra – bildbevis!",
    points: 20,
    duration_seconds: 150,
    emoji: "🎶",
  },
  {
    title: "Kräftbib-mode",
    description: "Posera stolt i din kräftbib/haklapp.",
    points: 10,
    duration_seconds: 90,
    emoji: "🦞",
  },
  {
    title: "Månskensdans",
    description: "Dansa med någon under månen – ta en bild!",
    points: 20,
    duration_seconds: 120,
    emoji: "💃",
  },
  {
    title: "Grimasfoto",
    description: "Gör den fulaste grimasen du kan tillsammans med en vän.",
    points: 10,
    duration_seconds: 90,
    emoji: "🤪",
  },
  {
    title: "Hitta paret",
    description: "Hitta någon med samma skostorlek som dig och fota era fötter ihop.",
    points: 15,
    duration_seconds: 150,
    emoji: "👟",
  },
  {
    title: "Kräftklo-tävling",
    description: "Härma en kräftklo med händerna tillsammans med någon.",
    points: 10,
    duration_seconds: 90,
    emoji: "🦀",
  },
  {
    title: "Balanskonstnären",
    description: "Balansera en sked (eller kräfta) på näsan och ta en bild.",
    points: 15,
    duration_seconds: 90,
    emoji: "🥄",
  },
  {
    title: "Hemlig komplimang",
    description: "Ge någon en komplimang och ta en selfie tillsammans direkt efteråt.",
    points: 10,
    duration_seconds: 120,
    emoji: "💛",
  },
];

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  if (!user.is_admin) {
    return NextResponse.json({ error: "Ingen behörighet." }, { status: 403 });
  }

  const existing = await getAll<{ title: string }>("SELECT title FROM challenges");
  const existingTitles = new Set(existing.map((r) => r.title));

  const toInsert = DEFAULT_CHALLENGES.filter((c) => !existingTitles.has(c.title));

  await runBatch(
    toInsert.map((c) => ({
      sql: `INSERT INTO challenges (title, description, points, duration_seconds, emoji, created_by)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [c.title, c.description, c.points, c.duration_seconds, c.emoji, user.id],
    }))
  );

  return NextResponse.json({ added: toInsert.length });
}
