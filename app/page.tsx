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
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
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
          transparent before the title, so the title and everything below it
          sit on the fully blurred mirror layer, not on a half-sharp/half-
          blurred blend. */}
      <Image
        src="/party-hero.jpg"
        alt="Förra årets kräftskiva på Brattön"
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ maskImage: "linear-gradient(to bottom, black 22%, transparent 48%)" }}
      />
      {/* Final fade to white — a short, tight band instead of a long
          gradual darkening: the photo stays fully visible (just blurred)
          right up until this point, then dissolves to solid white quickly. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-44% to-white to-56%" />
      {/* Small top scrim only, purely so the very top edge (behind the
          status bar/notch, since there's no header on this page) doesn't
          look flat-cut. */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />

      <div className="relative z-10 mt-auto flex flex-col items-center gap-2.5 px-6 pb-10 pt-28 text-center">
        {/* Everything from here down sits on solid white, so text switches
            to dark ink instead of the cream used while still on the photo. */}
        <h1 className="max-w-xs font-sans text-[2.1rem] font-bold leading-[1.1] tracking-tight text-ink">
          {EVENT.title}
        </h1>
        <p className="text-[0.95rem] text-ink/70">{EVENT.dateLabel}</p>
        <p className="text-[0.95rem] text-ink/70">{EVENT.venue}</p>

        <div className="mt-4 flex w-full max-w-xs items-stretch overflow-hidden rounded-full border border-black/10 bg-black/[0.03] p-1.5 shadow-sm">
          <button
            onClick={() => router.push("/login")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent py-3.5 text-[0.95rem] font-semibold text-ink transition active:scale-[0.97]"
          >
            <Check size={16} strokeWidth={2.5} />
            Jag kommer
          </button>
          <div className="my-2 w-px bg-black/10" />
          <button
            onClick={() => router.push("/kan-ej")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3.5 text-[0.95rem] font-medium text-ink/70 transition active:scale-[0.97]"
          >
            <X size={16} strokeWidth={2.5} className="text-danger" />
            Kan inte
          </button>
        </div>

        {/* Plain text, not a card — reads fine directly on the white
            surface like the title/date above. */}
        <div className="mt-3 flex max-w-sm flex-col gap-2">
          <p className="text-sm font-semibold text-ink">{EVENT.welcomeHeading}</p>
          <p className="text-sm leading-relaxed text-ink/70">{EVENT.welcomeText}</p>
        </div>

        {/* Info card below the RSVP pill, same subtle-outline material,
            mirroring the "Hosted by ..." card in the reference. */}
        <div className="mt-1 flex w-full max-w-xs flex-col items-center gap-1 rounded-2xl border border-black/10 bg-black/[0.03] px-5 py-4 shadow-sm">
          <PartyPopper size={18} strokeWidth={1.75} className="text-accent" />
          <p className="text-sm font-medium text-ink">{EVENT.invited} inbjudna till kvällen</p>
          {attending !== null && (
            <p className="text-xs text-ink/55">
              {attending > 0 ? `${attending} har redan tackat ja` : "Bli en av de första att tacka ja!"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
