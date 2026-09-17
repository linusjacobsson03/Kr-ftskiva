"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check, HelpCircle, X } from "lucide-react";

const BOOKING_URL =
  "https://boka.lillabratton.se/accommodation?channelid=4b404e73-5916-46b1-a536-2c3ffc0ac4f5&+dryck=&roomconfig=a2&year=2026&month=9&day=19&staylength=1";

const FERRY_DOCK_URL = "https://maps.app.goo.gl/zFV9JaQsPpK5dcqU7?g_st=ic";

/** Edit these to match your own party. */
export const EVENT = {
  title: "Kräftskiva",
  dateLabel: "Lördag 19 september, 16:00",
  venue: "Lilla Brattön, båthuset",
  invited: 45,
  welcomeHeading: "VÄLKOMMEN TILL KRÄFTSKIVAN",
  welcomeIntro:
    "Sensommaren är här, kräftorna väntar och det är dags för en magisk dag – årets kräftskiva på Brattön! Vi lovar er en kväll fylld med god mat, många skratt, lekar och minnen. Så boka in kvällen, ladda batterierna och gör er redo – för det här vill ni inte missa! 🦞",
  sections: [
    {
      heading: "SÅ TAR NI ER TILL ÖN",
      body: [
        "Färjan går varje timme fram till klockan 16:00. Slutar man jobbet senare än så går det tyvärr inga mer turer utan vi får hjälpas åt att lösa det isf.",
        "Färjan kör hem alla från 01-02 i olika omgångar (max 11 åt gången), eller om man då sover på ön så kan man lägga sig när man vill 😉",
        `Färjan går från Almöbryggan: ${FERRY_DOCK_URL}`,
      ],
    },
    {
      heading: "VAD KOSTAR DET?",
      body: [
        "Vi kommer behöva ta 250 kr per person just för att täcka hyran – men som sagt ingår alla tillbehör: bröd, sås, sill, pajer och massa annat som kommer finnas på plats.",
        "Swisha 250 kr till 073-510 54 32 – det är till mig ni swishar.",
        "Det ni själva tar med er är:",
        "Kräftor, räkor eller annat gott ni vill käka",
        "Dryck – öl, vin, snaps eller vad törsten begär för dagen 🍻",
      ],
    },
    {
      heading: "PROGRAM FÖR KVÄLLEN",
      body: [
        "Vi har snickrat ihop massa roliga lekar och aktiviteter som kommer förgylla kvällen, mer info kommer när vi ses!",
        "Vid 21-tiden tillkommer som sagt fler festsugna kompisar till båthuset, hör av er om det är någon speciell ni vill bjuda in så ska vi se vad vi kan lösa 😍",
      ],
    },
    {
      heading: "KLÄDKOD",
      body: ["Skärgårdsfest i sitt esse! 👙"],
    },
    {
      heading: "VILL NI STANNA KVAR?",
      body: [
        "För er som inte är redo att kvällen tar slut finns möjligheten att hyra en stuga på ön eller ta ut en båt att sova över i.",
        `Här har ni bokningslänken: ${BOOKING_URL}`,
      ],
    },
    {
      heading: "ALLERGIER ELLER SPECIALKOST?",
      body: ["Hör av er."],
    },
    {
      heading: "BRA ATT VETA",
      body: [
        "Båthusets fasad och inredningsbojar är målat i falu rödfärg. Brattön ersätter inga föremål eller kläder som blivit skadade av detta",
      ],
    },
  ],
  welcomeOutro: "Vi ses snart!",
  welcomeSignoff: "VARMT VÄLKOMMEN",
  rsvpDeadline: "OSA – vi behöver ert svar senast 11 september 🙏",
};

const URL_RE = /(https?:\/\/[^\s]+)/g;

function linkify(text: string): ReactNode[] {
  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      const href = part.replace(/[.,;:!?)]+$/, "");
      const trailing = part.slice(href.length);
      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[#7ab8f0] underline underline-offset-2 hover:text-[#a8d0f7]"
          >
            {href}
          </a>
          {trailing}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

type Rsvp = "yes" | "maybe" | "no";

export default function InviteHero({
  guestFirstName,
  guestDisplayName,
  initialRsvp = null,
  onRsvp,
}: {
  guestFirstName?: string | null;
  guestDisplayName?: string | null;
  initialRsvp?: Rsvp | null;
  onRsvp?: (value: Rsvp) => void;
}) {
  const [rsvp, setRsvp] = useState<Rsvp | null>(initialRsvp);
  const [guestCount, setGuestCount] = useState<number>(EVENT.invited);
  const [noticeOpen, setNoticeOpen] = useState(true);

  useEffect(() => {
    setRsvp(initialRsvp);
  }, [initialRsvp]);

  useEffect(() => {
    fetch("/api/invite-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.attending === "number" && d.attending >= 0) {
          setGuestCount(d.attending);
        }
      })
      .catch(() => undefined);
  }, []);

  function choose(value: Rsvp) {
    setRsvp(value);
    onRsvp?.(value);
  }

  const greeting = guestFirstName?.trim()
    ? `Hej, ${guestFirstName.trim()}`
    : null;

  return (
    <div className="relative min-h-dvh bg-[#0b0d0c] text-[#f3efe6]">
      {noticeOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ferry-notice-heading"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#14100d] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#7ab8f0]">
              OBS ⛴️
            </p>
            <h2
              id="ferry-notice-heading"
              className="font-display mt-1.5 text-xl font-semibold leading-tight text-[#f3efe6]"
            >
              Färjtider ut till ön
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[#f3efe6]/70">
              Färjan går <span className="font-semibold text-[#f3efe6]">14:00, 15:00</span> och{" "}
              <span className="font-semibold text-[#f3efe6]">16:00</span> – sen går det tyvärr inga
              fler turer ut, så var på plats innan 16:00!
            </p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#f3efe6]/70">
              Hemfärjan går sen 01–02.
            </p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#f3efe6]/70">
              Färjan går från{" "}
              <a
                href={FERRY_DOCK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#7ab8f0] underline underline-offset-2 hover:text-[#a8d0f7]"
              >
                Almöbryggan
              </a>
              .
            </p>
            <div className="mt-4 border-t border-white/[0.08] pt-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#f3efe6]/90">
                Ta med dig
              </p>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[#f3efe6]/70">
                Kräftor, räkor eller vad du vill käka – och dryck/alkohol 🍻
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNoticeOpen(false)}
              className="mt-5 w-full rounded-full bg-[#f3efe6] py-2.5 text-[0.85rem] font-bold text-[#0b0d0c] transition active:scale-[0.98]"
            >
              Uppfattat
            </button>
          </div>
        </div>
      ) : null}
      <div className="pb-24">
        <div className="relative h-[50vh] min-h-[280px] w-full overflow-hidden bg-[#1a1a1a]">
          <Image
            src="/kraftskiva-hero.jpg"
            alt="Lilla Brattön vid solnedgång"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_40%]"
          />
          {/* Film grain — knottrig / kornig look */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.35' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-soft-light"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 12%, transparent 45%, rgba(11,13,12,0.7) 78%, #0b0d0c 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 px-6 pb-5">
            <h1 className="font-title max-w-lg text-left text-[2.75rem] font-semibold italic leading-[0.95] tracking-tight text-[#f3efe6] drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)] sm:text-5xl">
              {EVENT.title}
            </h1>
            <p className="text-[0.95rem] text-[#f3efe6]/70">{EVENT.dateLabel}</p>
            <p className="text-[0.95rem] text-[#f3efe6]/70">{EVENT.venue}</p>
            <p className="text-[0.95rem] text-[#f3efe6]/70">
              {guestCount} {guestCount === 1 ? "person" : "personer"}
            </p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-lg flex-col gap-7 px-6 pt-4">
          {greeting ? (
            <p className="font-display text-[1.85rem] font-semibold leading-tight tracking-tight text-[#f3efe6]">
              {greeting}
              {guestDisplayName ? (
                <span className="sr-only"> — personlig inbjudan till {guestDisplayName}</span>
              ) : null}
            </p>
          ) : null}

          <div className="space-y-3">
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[#7ab8f0]">
              {EVENT.welcomeHeading}
            </p>
            <p className="text-[0.95rem] leading-relaxed text-[#f3efe6]/60">
              {EVENT.welcomeIntro}
            </p>
          </div>

          {EVENT.sections.map((section) => (
            <div key={section.heading} className="space-y-2.5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#f3efe6]/90">
                {section.heading}
              </p>
              {section.body.map((paragraph, j) => (
                <p
                  key={`${section.heading}-${j}`}
                  className="text-[0.95rem] leading-relaxed text-[#f3efe6]/60"
                >
                  {linkify(paragraph)}
                </p>
              ))}
            </div>
          ))}

          <div className="space-y-2.5 border-t border-white/[0.08] pt-5">
            <p className="text-[0.95rem] leading-relaxed text-[#f3efe6]/60">
              {EVENT.welcomeOutro}
            </p>
            <p className="font-display text-sm font-semibold tracking-wide text-[#f3efe6]">
              {EVENT.welcomeSignoff}
            </p>
            <p className="pt-2 text-[0.85rem] font-semibold leading-relaxed text-[#7ab8f0]">
              {EVENT.rsvpDeadline}
            </p>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-lg items-stretch rounded-full border border-white/[0.14] bg-black/45 p-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => choose("yes")}
            aria-pressed={rsvp === "yes"}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.7rem] font-bold leading-tight transition ${
              rsvp === "yes" ? "bg-white text-[#0b0d0c]" : "text-[#f3efe6]"
            }`}
          >
            <Check size={16} strokeWidth={2.5} />
            Jag kommer
          </button>
          <button
            type="button"
            onClick={() => choose("maybe")}
            aria-pressed={rsvp === "maybe"}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.7rem] font-bold leading-tight transition ${
              rsvp === "maybe" ? "bg-white text-[#0b0d0c]" : "text-[#f3efe6]"
            }`}
          >
            <HelpCircle size={16} strokeWidth={2.5} />
            Kanske
          </button>
          <button
            type="button"
            onClick={() => choose("no")}
            aria-pressed={rsvp === "no"}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-2.5 text-[0.7rem] font-bold leading-tight transition ${
              rsvp === "no" ? "bg-white text-[#0b0d0c]" : "text-[#f3efe6]"
            }`}
          >
            <X size={16} strokeWidth={2.5} />
            Kan inte
          </button>
        </div>
      </div>
    </div>
  );
}
