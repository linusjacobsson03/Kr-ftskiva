"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, PartyPopper } from "lucide-react";
import { useAuth } from "./providers";

/** Edit these to match your own party. */
const EVENT = {
  title: "Välkommen till kräftskiva på Brattön",
  dateLabel: "Lördag 19 september",
  timeLabel: "16:00",
  venue: "Lilla Brattön, båthuset",
  invited: 45,
};

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [attending, setAttending] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/hem");
    }
  }, [loading, user, router]);

  useEffect(() => {
    fetch("/api/invite-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAttending(typeof d.attending === "number" ? d.attending : null))
      .catch(() => setAttending(null));
  }, []);

  if (loading || user) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-64px)] flex-col overflow-hidden">
      {/* Full-bleed party photo, darkened toward the bottom so the invite
          text stays readable without hiding the picture itself. */}
      <Image
        src="/party-hero.jpg"
        alt="Förra årets kräftskiva på Brattön"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/95" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />

      <div className="relative z-10 mt-auto flex flex-col items-center gap-5 px-6 pb-10 pt-28 text-center">
        <span className="chip bg-black/35 text-cream backdrop-blur">
          <PartyPopper size={13} strokeWidth={2.25} className="text-accent-strong" />
          Du är inbjuden
        </span>

        <h1 className="font-display max-w-xs text-3xl font-medium leading-tight tracking-tight text-cream drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          {EVENT.title}
        </h1>

        <div className="flex flex-col items-center gap-1.5 text-[0.95rem] text-cream/90">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={15} strokeWidth={1.75} className="text-accent-strong" />
            {EVENT.dateLabel} · {EVENT.timeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={15} strokeWidth={1.75} className="text-accent-strong" />
            {EVENT.venue}
          </span>
        </div>

        <p className="text-xs text-cream/60">
          {EVENT.invited} inbjudna
          {attending !== null && ` · ${attending} har redan tackat ja`}
        </p>

        <div className="mt-2 flex w-full max-w-xs overflow-hidden rounded-2xl border border-white/15 bg-black/25 backdrop-blur-sm">
          <button
            onClick={() => router.push("/login")}
            className="flex flex-1 items-center justify-center gap-1.5 bg-accent py-3.5 text-sm font-semibold text-ink transition active:scale-[0.98]"
          >
            Jag kommer
          </button>
          <button
            onClick={() => router.push("/kan-ej")}
            className="flex-1 py-3.5 text-sm font-medium text-cream/80 transition active:scale-[0.98]"
          >
            Kan tyvärr inte
          </button>
        </div>
      </div>
    </div>
  );
}
