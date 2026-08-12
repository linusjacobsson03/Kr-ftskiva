"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, HelpCircle, PartyPopper, X } from "lucide-react";

/** Edit these to match your own party. */
export const EVENT = {
  title: "Kräftskiva",
  dateLabel: "Lördag 19 september, 16:00",
  venue: "Lilla Brattön, båthuset",
  invited: 45,
  welcomeHeading: "VÄLKOMNA TILL ÅRETS KRÄFTSKIVA – BRATTÖN BÅTHUSET",
  welcomeIntro:
    "Sensommaren är här, kräftorna väntar och det är dags för det vi alla har längtat efter – årets kräftskiva på Brattön! Vi lovar er en kväll fylld med god mat, hårda skratt, klassiska lekar och minnen som kommer pratas om långt in på nästa sommar. Så boka in kvällen, ladda batterierna och gör er redo – för det här ska bli EPIC.",
  sections: [
    {
      heading: "SÅ TAR NI ER TILL ÖN",
      body: [
        "Färjan går varje timme fram till klockan 16:00. Vi vill såklart att så många som möjligt är på plats i god tid, så ta gärna en tur 16:00 eller tidigare om ni har möjlighet – då hinner vi mingla, hitta bra platser och komma igång innan kvällen exploderar.",
        "Kommer ni senare är det absolut inga problem – vi har ordnat med en kille som kör extra turer ut till ön, så ingen blir lämnad på bryggan.",
        "Klockan 20:00 fylls ön på ännu mer när fler ansluter för att vara med på festen – och då rullar båten extra turer igen för att ta emot alla som kommer.",
        "När natten går mot sitt slut och benen börjar bli trötta av dans kör båten hem folk klockan 00:00 samt 01:00, så ingen behöver stressa hem för tidigt.",
      ],
    },
    {
      heading: "VILL NI STANNA KVAR?",
      body: [
        "För er som inte är redo att kvällen tar slut finns möjligheten att hyra en stuga på ön eller ta ut en båt att sova över i. Perfekt om ni vill vakna upp till morgondopp och kvarvarande festkänsla dagen efter. Hör av er i god tid om det här är något för er, så fixar vi det!",
      ],
    },
    {
      heading: "VAD KOSTAR DET?",
      body: [
        "200 kr per person. I det ingår alla tillbehör – potatis, bröd, sås, smör och allt annat som hör en kräftskiva till. Det ni själva tar med er är:",
        "Kräftor, räkor eller annat gott ni vill käka",
        "Dryck – öl, vin, snaps eller vad hjärtat begär",
      ],
    },
    {
      heading: "PROGRAM FÖR KVÄLLEN",
      body: [
        "Vi har snickrat ihop massa roliga lekar och aktiviteter som kommer sätta både lagkänsla och tävlingsinstinkt på prov. Häng med, samla poäng och kämpa för äran – mer info kommer när vi ses!",
      ],
    },
    {
      heading: "KLÄDKOD",
      body: [
        "Klä upp er!, hattar och dylikt finns på plats så det behöver ni inte tänka på",
      ],
    },
    {
      heading: "ALLERGIER ELLER SPECIALKOST?",
      body: [
        "Hör av er så löser vi det tillsammans – ingen ska behöva sitta hungrig eller orolig.",
      ],
    },
  ],
  welcomeOutro:
    "Vi kan inte vänta på att få fira den här kvällen tillsammans med er. Ses på bryggan, ses på ön, ses vid kräftorna!",
  welcomeSignoff: "VARMT VÄLKOMNA – DET HÄR BLIR STORT.",
};

type Rsvp = "yes" | "maybe" | "no";

export default function InviteHero({
  guestFirstName,
  guestDisplayName,
  initialRsvp = null,
  onRsvp,
}: {
  /** When set, the hero greets this person by name on the photo. */
  guestFirstName?: string | null;
  guestDisplayName?: string | null;
  initialRsvp?: Rsvp | null;
  onRsvp?: (value: Rsvp) => void;
}) {
  const [attending, setAttending] = useState<number | null>(null);
  const [rsvp, setRsvp] = useState<Rsvp | null>(initialRsvp);

  useEffect(() => {
    setRsvp(initialRsvp);
  }, [initialRsvp]);

  useEffect(() => {
    fetch("/api/invite-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAttending(typeof d.attending === "number" ? d.attending : null))
      .catch(() => setAttending(null));
  }, []);

  function choose(value: Rsvp) {
    setRsvp(value);
    onRsvp?.(value);
  }

  const greeting = guestFirstName?.trim()
    ? `Hej, ${guestFirstName.trim()}`
    : null;

  return (
    <div className="relative">
      {/* Photo + fade only — no solid plate under the RSVP */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[62vh] overflow-hidden">
        <Image
          src="/party-hero.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="-scale-y-100 object-cover object-[center_78%] blur-3xl"
        />
        <Image
          src="/party-hero.jpg"
          alt="Förra årets kräftskiva på Brattön"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_78%]"
          style={{ maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)" }}
        />
        {/* Narrow fade → same #0b0d0c as welcome text; mid-band ≈ RSVP center */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 82%, #0b0d0c 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.38] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {greeting && (
        <div className="pointer-events-none absolute inset-x-0 top-[12%] z-10 px-6 text-center">
          <p className="font-display text-[2rem] font-medium leading-tight tracking-tight text-cream drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:text-[2.35rem]">
            {greeting}
          </p>
          {guestDisplayName && (
            <p className="sr-only">Personlig inbjudan till {guestDisplayName}</p>
          )}
        </div>
      )}

      <div className="relative z-10">
        {/* Title sits above the fade / RSVP band */}
        <div className="flex min-h-[calc(62vh-3.25rem)] flex-col items-center justify-end gap-1.5 px-6 pb-3 pt-16 text-center">
          <h1 className="max-w-xs font-sans text-[2.1rem] font-bold leading-[1.1] tracking-tight text-cream">
            {EVENT.title}
          </h1>
          <p className="text-[0.95rem] text-cream/65">{EVENT.dateLabel}</p>
          <p className="text-[0.95rem] text-cream/65">{EVENT.venue}</p>
        </div>

        {/* Glass only — no plate behind; photo fade shows through */}
        <div className="sticky top-0 z-30 px-6 pb-3">
          <div className="mx-auto flex w-full max-w-lg items-stretch rounded-full border border-white/[0.12] bg-white/[0.14] p-1 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => choose("yes")}
              aria-pressed={rsvp === "yes"}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.72rem] font-semibold leading-tight transition ${
                rsvp === "yes" ? "bg-white text-ink" : "text-cream"
              }`}
            >
              <Check size={16} strokeWidth={2.5} />
              Jag kommer
            </button>
            <button
              type="button"
              onClick={() => choose("maybe")}
              aria-pressed={rsvp === "maybe"}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.72rem] font-semibold leading-tight transition ${
                rsvp === "maybe" ? "bg-white text-ink" : "text-cream"
              }`}
            >
              <HelpCircle size={16} strokeWidth={2.5} />
              Kanske
            </button>
            <button
              type="button"
              onClick={() => choose("no")}
              aria-pressed={rsvp === "no"}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.72rem] font-semibold leading-tight transition ${
                rsvp === "no" ? "bg-white text-ink" : "text-cream"
              }`}
            >
              <X size={16} strokeWidth={2.5} />
              Kan inte
            </button>
          </div>
        </div>

        {/* Welcome text — solid bg starts here, below the RSVP */}
        <div className="relative bg-[#0b0d0c] px-6 pb-14 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-soft-light"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative mx-auto flex w-full max-w-lg flex-col gap-7 text-left">
            <div className="space-y-3">
              <p className="text-center text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-accent-strong">
                {EVENT.welcomeHeading}
              </p>
              <p className="text-sm leading-relaxed text-cream/70">{EVENT.welcomeIntro}</p>
            </div>

            {EVENT.sections.map((section, i) => (
              <div key={section.heading} className="space-y-2.5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-cream/90">
                  {section.heading}
                </p>
                {section.body.map((paragraph, j) => (
                  <p key={`${i}-${j}`} className="text-sm leading-relaxed text-cream/60">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}

            <div className="space-y-3 border-t border-white/[0.08] pt-6 text-center">
              <p className="text-sm leading-relaxed text-cream/70">{EVENT.welcomeOutro}</p>
              <p className="text-sm font-semibold tracking-wide text-cream">
                {EVENT.welcomeSignoff}
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-center">
              <PartyPopper size={18} strokeWidth={1.75} className="text-accent" />
              <p className="text-sm font-medium text-cream">{EVENT.invited} inbjudna till kvällen</p>
              {attending !== null && (
                <p className="text-xs text-cream/45">
                  {attending > 0 ? `${attending} har redan tackat ja` : "Bli en av de första att tacka ja!"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
