"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, ChevronRight, MessageSquare, Sparkles, Trophy, UtensilsCrossed } from "lucide-react";
import PushOptIn from "./components/PushOptIn";
import Countdown from "./components/Countdown";
import { useAuth } from "./providers";
import type { PendingAssignment } from "@/lib/types";

function HomeContent() {
  const { user, loading, refresh } = useAuth();
  const [pending, setPending] = useState<PendingAssignment[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/challenges/active", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setPending(data.pending ?? []);
      } finally {
        if (!cancelled) setLoadingChallenges(false);
      }
    }
    load();
    const id = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const links = [
    { href: "/challenges", icon: UtensilsCrossed, label: "Utmaningar", desc: "Vinn poäng" },
    { href: "/photos", icon: Camera, label: "Foton", desc: "Dagens minnen" },
    { href: "/leaderboard", icon: Trophy, label: "Topplista", desc: "Vem leder?" },
  ];

  // Home matches the rest of the light app theme.
  return (
    <div className="flex-1 bg-bg">
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
        </div>
      ) : (
        <div className="mx-auto max-w-xl space-y-6 px-4 py-7">
          <div>
            <h1 className="font-display text-[1.75rem] font-medium tracking-tight text-cream">
              {user ? `Hej, ${user.firstName}` : "Kräftskiva"}
            </h1>
            <p className="mt-0.5 font-display italic text-muted">
              Välkommen till kvällens kräftskiva
            </p>
          </div>

          {!user && (
            <Link
              href="/inbjudan"
              className="card flex items-center gap-3 border-accent/25 bg-accent/[0.08] p-4 transition hover:bg-accent/[0.12]"
            >
              <MessageSquare size={18} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-cream">Har du fått en inbjudan?</p>
                <p className="text-xs text-muted">
                  Öppna din personliga länk från SMS för att delta med ditt namn
                </p>
              </div>
              <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-accent-strong" />
            </Link>
          )}

          {user && (
            <>
              <div className="card flex items-center justify-between px-6 py-5">
                <div>
                  <p className="section-label">Dina poäng</p>
                  <p className="font-display mt-1 text-5xl font-medium text-accent-strong tabular">
                    {user.points ?? 0}
                  </p>
                </div>
                <Trophy size={34} strokeWidth={1.25} className="text-accent/70" />
              </div>
              <PushOptIn />
            </>
          )}

          {!loadingChallenges && pending.length > 0 && (
            <div className="space-y-3">
              <p className="section-label">Aktiv utmaning</p>
              {pending.map((p) => (
                <Link
                  key={p.id}
                  href="/challenges"
                  className="card block border-l-2 border-l-accent p-4 transition hover:bg-accent/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-lg font-medium text-cream">{p.title}</p>
                    <Countdown deadlineIso={p.deadlineIso} className="text-lg text-accent-strong" />
                  </div>
                  <p className="mt-1 text-sm text-muted">{p.description}</p>
                  <p className="mt-2.5 flex items-center gap-1 text-sm font-medium text-accent-strong">
                    Värd {p.points} poäng — ta bildbevis
                    <ChevronRight size={15} strokeWidth={2} />
                  </p>
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {links.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="card flex flex-col items-center gap-2 py-5 text-center transition hover:bg-black/[0.02] active:scale-[0.98]"
                >
                  <Icon size={22} strokeWidth={1.5} className="text-accent-strong" />
                  <span className="text-sm font-medium text-cream">{l.label}</span>
                  <span className="text-xs text-muted">{l.desc}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted">
            <Sparkles size={12} strokeWidth={1.75} />
            Skål för kvällen
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
