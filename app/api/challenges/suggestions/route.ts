import { NextResponse } from "next/server";
import { getAdminSession, getCurrentUser } from "@/lib/auth";
import { getAll, runBatch, CHALLENGE_DURATION_SECONDS } from "@/lib/db";
import { apiError } from "@/lib/apiError";

/**
 * A batch of candidate challenges spanning four difficulty tiers, scored
 * 1 (Lätt) / 2 (Medel) / 3 (Svår) / 5 (Vågad) — see `difficultyOf` in
 * app/admin/page.tsx. Every challenge gets the same 5-minute window
 * (CHALLENGE_DURATION_SECONDS), so duration isn't tracked per-entry here.
 *
 * `suggestedTime` is a "HH:MM" hint for when this dare fits a real
 * kräftskiva's rhythm (eating/toasting early, mingling and dancing later,
 * bolder stuff once the party's loosened up) — it just prefills the
 * scheduling form in Admin; the admin can always override it.
 *
 * Deliberately generic on who's involved ("någon", "en främling") rather
 * than naming a specific real person as the target of a kiss/make-out —
 * whoever draws the challenge picks a willing partner themselves. The
 * personalized batch below names real guests but keeps to non-physical,
 * non-romantic dares for that reason.
 */
const SUGGESTED_CHALLENGES = [
  // Lätt (1p)
  { title: "Kräftbib-mode", description: "Posera stolt i din kräftbib/haklapp.", points: 1, emoji: "🦞", suggestedTime: "17:15" },
  { title: "Skål för kräftorna!", description: "Skåla med minst tre personer – fånga det på bild.", points: 1, emoji: "🍻", suggestedTime: "17:30" },
  { title: "Hemlig komplimang", description: "Ge någon en komplimang och ta en selfie tillsammans direkt efteråt.", points: 1, emoji: "💛", suggestedTime: "18:30" },
  { title: "Selfie med okänd", description: "Ta en selfie med någon du inte känner sedan innan.", points: 1, emoji: "🤳", suggestedTime: "19:00" },
  { title: "Grimasfoto", description: "Gör den fulaste grimasen du kan tillsammans med en vän.", points: 1, emoji: "🤪", suggestedTime: "19:30" },
  { title: "Balanskonstnären", description: "Balansera en sked (eller kräfta) på näsan och ta en bild.", points: 1, emoji: "🥄", suggestedTime: "20:00" },
  // Medel (2p)
  { title: "Mikrofonen är din", description: "Håll ett 15-sekunders skåltal för kräftskivan inför minst fyra personer.", points: 2, emoji: "🎤", suggestedTime: "17:45" },
  { title: "Handskakning-turnén", description: "Skaka hand med fem personer du aldrig träffat, en efter en – bildbevis vid sista.", points: 2, emoji: "🤝", suggestedTime: "18:45" },
  { title: "Gruppfoto x5", description: "Samla fem personer du inte kom hit med till ett gruppfoto.", points: 2, emoji: "📸", suggestedTime: "19:00" },
  { title: "Isbiten", description: "Låt någon lägga en isbit i din tröja/krage – fånga reaktionen på bild.", points: 2, emoji: "🧊", suggestedTime: "20:00" },
  { title: "Vågad klunk", description: "Fråga en person du inte känner om du får ta en klunk av deras dryck.", points: 2, emoji: "🍹", suggestedTime: "20:30" },
  { title: "Dansa med en främling", description: "Dansa minst 20 sekunder med någon du inte pratat med förut.", points: 2, emoji: "🕺", suggestedTime: "21:00" },
  // Svår (3p)
  { title: "Kräftskiva är livet", description: "Få tre olika personer att säga \"kräftskiva är livet\" i samma bild.", points: 3, emoji: "🗣️", suggestedTime: "19:30" },
  { title: "Piggyback", description: "Bli buren (eller bär någon) piggyback minst tio steg.", points: 3, emoji: "🦵", suggestedTime: "20:30" },
  { title: "Kramkalas", description: "Samla en gruppkram med minst sex personer på en gång.", points: 3, emoji: "🫂", suggestedTime: "20:30" },
  { title: "Improv-scen", description: "Sätt upp en 30-sekunders påhittad scen med en annan gäst – någon filmar/fotar.", points: 3, emoji: "🎭", suggestedTime: "21:00" },
  { title: "Kindpuss-kombo", description: "Pussa någon (som vill!) på kinden.", points: 3, emoji: "😘", suggestedTime: "21:30" },
  { title: "Månskensdans", description: "Dansa en hel låt med någon du inte kom hit med.", points: 3, emoji: "💃", suggestedTime: "22:00" },
  // Vågad (5p) — frivillighet påtalad explicit i texten där det handlar om fysisk kontakt
  { title: "Nubbevisan", description: "Sjung en snapsvisa tillsammans med minst två andra – bildbevis!", points: 5, emoji: "🎶", suggestedTime: "17:30" },
  { title: "Hitta paret", description: "Hitta någon med samma skostorlek som dig och fota era fötter ihop.", points: 5, emoji: "👟", suggestedTime: "19:00" },
  { title: "Modig blick", description: "Håll ögonkontakt utan att skratta med en främling i 20 sekunder.", points: 5, emoji: "👀", suggestedTime: "21:00" },
  { title: "Serenad", description: "Sjung en kärlekssång för någon på skoj inför publik.", points: 5, emoji: "🎻", suggestedTime: "21:30" },
  { title: "Kärleksdeklaration", description: "Knäböj och gör en skämtsam kärleksförklaring till någon inför minst tre vittnen.", points: 5, emoji: "🔥", suggestedTime: "22:00" },
  { title: "Hångel-utmaningen", description: "Hångla med någon – helt frivilligt, bara om båda är peppade! Bildbevis på ögonblicket.", points: 5, emoji: "💋", suggestedTime: "22:30" },

  // ---- Personliga (namnger riktiga gäster — inga fysiska/romantiska
  // utmaningar riktade mot en specifik namngiven person, se kommentar ovan) ----
  { title: "Kräft-syskon-selfie", description: "Ta en selfie med Nathalie där ni båda gör kräftklor med händerna.", points: 1, emoji: "🤳", suggestedTime: "17:45" },
  { title: "Syskonkärlek", description: "Ge Nathalie en kram och säg något snällt om henne inför publik – bildbevis.", points: 3, emoji: "🎗️", suggestedTime: "18:00" },
  { title: "Säg till Linus", description: "Få någon att högtidligt utropa \"Linus app är sjukt najs!\" inför minst tre personer – bildbevis.", points: 1, emoji: "🎤", suggestedTime: "18:00" },
  { title: "Hyllningstal till Linus", description: "Håll ett 20-sekunders skämtsamt hyllningstal till Linus inför minst fyra personer.", points: 3, emoji: "🗣️", suggestedTime: "18:15" },
  { title: "Grentzelius-intervjun", description: "Intervjua David Grentzelius om kvällens bästa ögonblick hittills – filma eller fota svaret.", points: 2, emoji: "🎙️", suggestedTime: "18:30" },
  { title: "Wahlin-utmaningen", description: "Få Anton Wahlin att posera som en kräfta – klor och allt.", points: 1, emoji: "🦞", suggestedTime: "19:00" },
  { title: "Larsson-skrattet", description: "Få Elmer Larsson att skratta högt inom 30 sekunder – filma försöket.", points: 2, emoji: "😆", suggestedTime: "19:30" },
  { title: "Vänskaps-scen", description: "Sätt upp en kort påhittad scen tillsammans med två av: Anton, David, Frida, Lukas, Elmer eller Tindra.", points: 3, emoji: "🎭", suggestedTime: "20:00" },
  { title: "Nicklasson-tävlingen", description: "Utmana Lukas Nicklasson i tumkrig eller armbrytning – bildbevis på vinnaren.", points: 2, emoji: "🥇", suggestedTime: "20:00" },
  { title: "Ciccig-showen", description: "Få Tindra Ciccig att visa upp sitt bästa danssteg – bildbevis.", points: 2, emoji: "🕺", suggestedTime: "20:30" },
  { title: "Ström-dansen", description: "Dansa en runda med Frida Ström.", points: 1, emoji: "👯", suggestedTime: "21:00" },
  { title: "Sanning eller konsekvens", description: "Våga fråga en av kompisarna (Anton, David, Frida, Lukas, Elmer eller Tindra) en pinsam sanningsfråga inför gruppen – bildbevis på reaktionen.", points: 5, emoji: "😳", suggestedTime: "21:30" },
  { title: "Kräftskivans kung eller drottning", description: "Övertyga minst fem personer att rösta på dig som kvällens kräftskiva-kung/drottning – bildbevis på \"kröningen\".", points: 5, emoji: "🏆", suggestedTime: "22:30" },
];

export async function POST() {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { error: "Fel lösenord eller session har gått ut." },
        { status: 401 }
      );
    }

    // See app/api/challenges/route.ts — created_by is just bookkeeping now
    // that admin access isn't tied to a particular user account.
    const createdBy = (await getCurrentUser())?.id ?? null;

    const existing = await getAll<{ title: string }>("SELECT title FROM challenges");
    const existingTitles = new Set(existing.map((r) => r.title));

    const toInsert = SUGGESTED_CHALLENGES.filter((c) => !existingTitles.has(c.title));

    await runBatch(
      toInsert.map((c) => ({
        sql: `INSERT INTO challenges (title, description, points, duration_seconds, emoji, created_by, status, suggested_time)
              VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        args: [
          c.title,
          c.description,
          c.points,
          CHALLENGE_DURATION_SECONDS,
          c.emoji,
          createdBy,
          c.suggestedTime,
        ],
      }))
    );

    return NextResponse.json({ added: toInsert.length });
  } catch (err) {
    return apiError(err);
  }
}
