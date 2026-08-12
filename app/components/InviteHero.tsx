"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, HelpCircle, PartyPopper, X } from "lucide-react";

/** Edit these to match your own party. */
export const EVENT = {
  title: "Kräftskiva",
  dateLabel: "Lördag 19 september, 16:00",
  venue: "Lilla Brattön, båthuset",
  invited: 45,
  welcomeHeading: "Välkommen till kräftskiva på Brattön!",
  welcomeText:
    "Vi samlas för klassisk skaldjursfest med kräftor, skratt och lyktljus i sensommarkvällen. Kom i sommarhumör — vi står för kräftor, snaps och stämning. Under kvällen väntar också roliga utmaningar direkt i appen: lös dem inom tidsgränsen, ladda upp bildbevis och klättra på topplistan. Glöm inte kameran — alla minnen samlas i det gemensamma fotoflödet efteråt!",
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
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
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
        style={{ maskImage: "linear-gradient(to bottom, black 28%, transparent 55%)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-44% via-bg/75 via-56% to-bg to-64%" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.38] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {greeting && (
        <div className="pointer-events-none absolute inset-x-0 top-[26%] z-10 px-6 text-center">
          <p className="font-display text-[2rem] font-medium leading-tight tracking-tight text-cream drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:text-[2.35rem]">
            {greeting}
          </p>
          {guestDisplayName && (
            <p className="sr-only">Personlig inbjudan till {guestDisplayName}</p>
          )}
        </div>
      )}

      <div className="relative z-10 mt-auto flex flex-col items-center gap-2.5 px-6 pb-10 pt-28 text-center">
        <h1 className="max-w-xs font-sans text-[2.1rem] font-bold leading-[1.1] tracking-tight text-cream">
          {EVENT.title}
        </h1>
        <p className="text-[0.95rem] text-cream/65">{EVENT.dateLabel}</p>
        <p className="text-[0.95rem] text-cream/65">{EVENT.venue}</p>

        <div className="mt-4 flex w-full items-stretch rounded-full bg-white/[0.1] p-1 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.65)] backdrop-blur-xl">
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

        <div className="mt-3 flex max-w-sm flex-col gap-2">
          <p className="text-sm font-semibold text-cream">{EVENT.welcomeHeading}</p>
          <p className="text-sm leading-relaxed text-cream/60">{EVENT.welcomeText}</p>
        </div>

        <div className="mt-1 flex w-full max-w-sm flex-col items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
          <PartyPopper size={18} strokeWidth={1.75} className="text-accent" />
          <p className="text-sm font-medium text-cream">{EVENT.invited} inbjudna till kvällen</p>
          {attending !== null && (
            <p className="text-xs text-cream/45">
              {attending > 0 ? `${attending} har redan tackat ja` : "Bli en av de första att tacka ja!"}
            </p>
          )}
        </div>

        <Link
          href="/"
          className="mt-2 text-sm font-medium text-cream/55 underline-offset-4 transition hover:text-cream hover:underline"
        >
          Gå till appen
        </Link>
      </div>
    </div>
  );
}
