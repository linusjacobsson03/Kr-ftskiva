"use client";

import { useEffect, useState } from "react";
import AuthGate from "../components/AuthGate";
import { useAuth } from "../providers";
import type { LeaderboardEntry } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardContent() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      if (!cancelled) {
        setEntries(data.leaderboard ?? []);
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-extrabold">🏆 Topplista</h1>
        <p className="text-white/60">Vem tar hem kvällens kräftbukal?</p>
      </div>

      {loading ? (
        <p className="text-center text-white/50">Laddar…</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`card flex items-center gap-3 p-3 ${
                entry.username === user?.username ? "border-2 border-amber-400/50" : ""
              }`}
            >
              <div className="w-8 text-center text-xl font-bold text-white/60">
                {MEDALS[i] ?? i + 1}
              </div>
              <div className="text-2xl">{entry.avatar_emoji}</div>
              <div className="flex-1">
                <p className="font-semibold">{entry.display_name}</p>
                <p className="text-xs text-white/50">
                  {entry.challenges_completed} utmaningar klara
                </p>
              </div>
              <div className="text-xl font-extrabold text-amber-300">{entry.points}</div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-center text-white/50">Inga deltagare än.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <AuthGate>
      <LeaderboardContent />
    </AuthGate>
  );
}
