"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useAuth } from "./providers";

/** Edit these to match your own party. */
const EVENT = {
  title: "Kräftskiva på Brattön",
  dateLabel: "Lördag 19 september, 16:00",
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
      {/* Full-bleed party photo. Sharp at the top, then the panel below
          progressively blurs it (via backdrop-blur + a fade mask) instead of
          just darkening it — a soft, frosted transition rather than a flat
          tinted rectangle. */}
      <Image
        src="/party-hero.jpg"
        alt="Förra årets kräftskiva på Brattön"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[65%] backdrop-blur-2xl"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 45%)" }}
      />
      {/* Darkens + blends into the page background underneath the blur, so
          text stays legible and the photo never ends as a hard edge. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/35 via-55% to-[color:var(--color-bg)]" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />

      <div className="relative z-10 mt-auto flex flex-col items-center gap-2.5 px-6 pb-10 pt-28 text-center">
        <h1 className="max-w-xs font-sans text-[2.1rem] font-bold leading-[1.1] tracking-tight text-cream">
          {EVENT.title}
        </h1>
        <p className="text-[0.95rem] text-cream/80">{EVENT.dateLabel}</p>
        <p className="text-[0.95rem] text-cream/80">{EVENT.venue}</p>

        <p className="mt-1 text-xs text-cream/55">
          {EVENT.invited} inbjudna
          {attending !== null && ` · ${attending} har redan tackat ja`}
        </p>

        <div className="mt-4 flex w-full max-w-xs items-stretch overflow-hidden rounded-full border border-white/15 bg-black/25 p-1 backdrop-blur-md">
          <button
            onClick={() => router.push("/login")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-cream py-2.5 text-sm font-semibold text-ink transition active:scale-[0.97]"
          >
            <Check size={15} strokeWidth={2.5} className="text-success" />
            Jag kommer
          </button>
          <div className="my-1.5 w-px bg-white/15" />
          <button
            onClick={() => router.push("/kan-ej")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium text-cream/85 transition active:scale-[0.97]"
          >
            <X size={15} strokeWidth={2.5} className="text-danger" />
            Kan inte
          </button>
        </div>
      </div>
    </div>
  );
}
