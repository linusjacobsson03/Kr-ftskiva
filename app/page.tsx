"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, PartyPopper, X } from "lucide-react";
import { useAuth } from "./providers";

/** Edit these to match your own party. */
const EVENT = {
  title: "Kräftskiva",
  dateLabel: "Lördag 19 september, 16:00",
  venue: "Lilla Brattön, båthuset",
  invited: 45,
  // Starting draft — swap for your own words whenever you're ready.
  welcomeHeading: "Välkommen till kräftskiva på Brattön!",
  welcomeText:
    "Vi samlas för klassisk skaldjursfest med kräftor, skratt och lyktljus i sensommarkvällen. Kom i sommarhumör — vi står för kräftor, snaps och stämning. Under kvällen väntar också roliga utmaningar direkt i appen: lös dem inom tidsgränsen, ladda upp bildbevis och klättra på topplistan. Glöm inte kameran — alla minnen samlas i det gemensamma fotoflödet efteråt!",
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
      {/* Layer A: a mirrored, heavily blurred copy of the same photo — the
          base layer that shows through once the sharp layer above fades
          away. A real `blur` filter on the pixels themselves, not a
          backdrop-blur panel sitting on top of the sharp image (that only
          hazes whatever's behind a translucent surface — the sharp detail
          underneath was still fully there, which read as "barely blurred"). */}
      <Image
        src="/party-hero.jpg"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="-scale-y-100 object-cover blur-3xl"
      />
      {/* Layer B: the real, sharp photo on top — masked so it fades to fully
          transparent *before* the title (which sits ~56% down the hero),
          so the title and everything below it sit on the fully blurred
          mirror layer, not on a half-sharp/half-blurred blend. */}
      <Image
        src="/party-hero.jpg"
        alt="Förra årets kräftskiva på Brattön"
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ maskImage: "linear-gradient(to bottom, black 22%, transparent 48%)" }}
      />
      {/* Final darken + blend into the page's own background color — now
          reaching fully solid well before the container's bottom edge
          (~66%, right after the title, which ends ~64.5% down) instead of
          only at 100%, so everything below the title sits on a clean dark
          surface rather than a still-visible (if blurred) photo. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 via-38% to-[color:var(--color-bg)] to-66%" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />

      <div className="relative z-10 mt-auto flex flex-col items-center gap-2.5 px-6 pb-10 pt-28 text-center">
        {/* Title sits on top of the blur, like the reference. */}
        <h1 className="max-w-xs font-sans text-[2.1rem] font-bold leading-[1.1] tracking-tight text-cream">
          {EVENT.title}
        </h1>
        <p className="text-[0.95rem] text-cream/80">{EVENT.dateLabel}</p>
        <p className="text-[0.95rem] text-cream/80">{EVENT.venue}</p>

        <div className="mt-4 flex w-full max-w-xs items-stretch overflow-hidden rounded-full border border-white/25 bg-white/10 p-1.5 shadow-xl backdrop-blur-xl">
          <button
            onClick={() => router.push("/login")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-cream py-3.5 text-[0.95rem] font-semibold text-ink transition active:scale-[0.97]"
          >
            <Check size={16} strokeWidth={2.5} className="text-success" />
            Jag kommer
          </button>
          <div className="my-2 w-px bg-white/20" />
          <button
            onClick={() => router.push("/kan-ej")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3.5 text-[0.95rem] font-medium text-cream/85 transition active:scale-[0.97]"
          >
            <X size={16} strokeWidth={2.5} className="text-danger" />
            Kan inte
          </button>
        </div>

        {/* Plain text, not a card — the background here is now solid, not
            the photo, so it reads fine directly on the surface like the
            title/date above. */}
        <div className="mt-3 flex max-w-sm flex-col gap-2">
          <p className="text-sm font-semibold text-cream">{EVENT.welcomeHeading}</p>
          <p className="text-sm leading-relaxed text-cream/75">{EVENT.welcomeText}</p>
        </div>

        {/* Info card below the RSVP pill, same frosted-glass material,
            mirroring the "Hosted by ..." card in the reference. */}
        <div className="mt-1 flex w-full max-w-xs flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 shadow-lg backdrop-blur-xl">
          <PartyPopper size={18} strokeWidth={1.75} className="text-accent-strong" />
          <p className="text-sm font-medium text-cream">{EVENT.invited} inbjudna till kvällen</p>
          {attending !== null && (
            <p className="text-xs text-cream/65">
              {attending > 0 ? `${attending} har redan tackat ja` : "Bli en av de första att tacka ja!"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
