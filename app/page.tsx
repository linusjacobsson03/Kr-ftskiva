"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { useAuth } from "./providers";

/** Edit these two to match your own party. */
const EVENT = {
  place: "Brattön",
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
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-4 py-12 text-center">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={72}
        height={72}
        className="rounded-2xl shadow-[0_20px_50px_-20px_rgba(201,161,90,0.4)]"
      />

      <h1 className="font-display mt-6 max-w-xs text-4xl font-medium leading-tight tracking-tight text-cream">
        Kräftskiva på {EVENT.place}
      </h1>
      <p className="mt-3 max-w-xs font-display text-[1.05rem] italic text-muted">
        En kväll med kräftor, utmaningar och gott sällskap — du är inbjuden!
      </p>

      <div className="chip mt-6">
        {EVENT.invited} inbjudna
        {attending !== null && ` · ${attending} har redan tackat ja`}
      </div>

      <div className="mt-9 flex w-full max-w-xs flex-col gap-3">
        <button onClick={() => router.push("/login")} className="btn-primary w-full">
          <PartyPopper size={17} strokeWidth={1.75} />
          Jag kommer
        </button>
        <button onClick={() => router.push("/kan-ej")} className="btn-secondary w-full">
          Jag kan tyvärr inte
        </button>
      </div>
    </div>
  );
}
