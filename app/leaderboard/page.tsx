"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Settings, Trophy } from "lucide-react";
import Avatar from "../components/Avatar";
import { useAuth } from "../providers";
import type { LeaderboardEntry } from "@/lib/types";

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
    <div className="mx-auto max-w-xl space-y-6 px-4 py-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-cream">Topplista</h1>
          <p className="mt-0.5 text-sm text-muted">Vem tar hem kvällens kräftbukal?</p>
        </div>
        {/* Admin no longer has its own nav tab — this is the way in now.
            Not gated by login state, same as the tab used to be: anyone who
            knows the shared passcode gets past AdminPasscodeGate regardless
            of how they navigated here. */}
        <Link
          href="/admin"
          aria-label="Admin"
          title="Admin"
          className="shrink-0 rounded-full p-2 text-muted transition hover:bg-black/[0.05] hover:text-cream"
        >
          <Settings size={19} strokeWidth={1.75} />
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted">Laddar…</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isTop = rank === 1 && entry.points > 0;
            const isMe = entry.id === user?.id;
            return (
              <div
                key={entry.id}
                className={`card flex items-center gap-3.5 p-3.5 ${
                  isTop ? "border-accent/30 bg-accent/[0.05]" : ""
                } ${isMe ? "border-l-2 border-l-accent" : ""}`}
              >
                <div className="font-display w-6 text-center text-lg text-muted">{rank}</div>
                <Avatar name={entry.display_name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-cream">{entry.display_name}</p>
                  <p className="text-xs text-muted">
                    {entry.challenges_completed} utmaningar klara
                  </p>
                </div>
                {isTop && <Trophy size={16} strokeWidth={1.5} className="text-accent-strong" />}
                <div className="font-display tabular text-xl font-medium text-accent-strong">
                  {entry.points}
                </div>
              </div>
            );
          })}
          {entries.length === 0 && (
            <p className="text-center text-sm text-muted">Inga deltagare än.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return <LeaderboardContent />;
}
