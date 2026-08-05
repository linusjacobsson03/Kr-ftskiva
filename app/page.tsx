"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGate from "./components/AuthGate";
import PushOptIn from "./components/PushOptIn";
import Countdown from "./components/Countdown";
import { useAuth } from "./providers";
import type { PendingAssignment } from "@/lib/types";

function HomeContent() {
  const { user, refresh } = useAuth();
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
    { href: "/challenges", emoji: "🎯", label: "Utmaningar", desc: "Vinn poäng" },
    { href: "/photos", emoji: "📸", label: "Foton", desc: "Dagens minnen" },
    { href: "/leaderboard", emoji: "🏆", label: "Topplista", desc: "Vem leder?" },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-extrabold">
          Hej {user?.avatarEmoji} {user?.displayName}!
        </h1>
        <p className="text-white/60">Välkommen till kvällens kräftskiva 🌙</p>
      </div>

      <div className="card flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-white/60">Dina poäng</p>
          <p className="text-4xl font-extrabold text-amber-300">{user?.points ?? 0}</p>
        </div>
        <div className="text-6xl">🥇</div>
      </div>

      <PushOptIn />

      {!loadingChallenges && pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Aktiv utmaning
          </h2>
          {pending.map((p) => (
            <Link
              key={p.id}
              href="/challenges"
              className="card block animate-[pulse_2.5s_ease-in-out_infinite] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold">
                  {p.emoji} {p.title}
                </p>
                <Countdown deadlineIso={p.deadlineIso} className="text-lg" />
              </div>
              <p className="mt-1 text-sm text-white/70">{p.description}</p>
              <p className="mt-2 text-sm font-semibold text-amber-300">
                Värd {p.points} poäng — tryck för att ta bildbevis! →
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="card flex flex-col items-center gap-1 p-4 text-center transition active:scale-95"
          >
            <span className="text-3xl">{l.emoji}</span>
            <span className="text-sm font-semibold">{l.label}</span>
            <span className="text-xs text-white/50">{l.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGate>
      <HomeContent />
    </AuthGate>
  );
}
