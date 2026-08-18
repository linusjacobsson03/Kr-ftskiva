"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, ChevronLeft, Medal, Settings, Trophy } from "lucide-react";
import EvidenceCard from "../components/EvidenceCard";
import Lightbox from "../components/Lightbox";
import { useAuth } from "../providers";
import type { LeaderboardEntry, Submission } from "@/lib/types";

function RankMark({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex shrink-0 items-center gap-1.5" title="1:a plats">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#9fd0ff] to-[#2e82d6] text-white shadow-[0_2px_8px_rgba(46,130,214,0.4)]">
          <Trophy size={15} strokeWidth={2.25} />
        </span>
        <span className="font-display text-base font-semibold tabular text-accent-strong">1</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex shrink-0 items-center gap-1.5" title="2:a plats">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#f0f0f0] to-[#a8aeb8] text-[#3d4450] shadow-[0_2px_8px_rgba(120,130,145,0.35)]">
          <Medal size={15} strokeWidth={2.25} />
        </span>
        <span className="font-display text-base font-semibold tabular text-muted">2</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex shrink-0 items-center gap-1.5" title="3:e plats">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#f0c9a0] to-[#b87333] text-[#5a3210] shadow-[0_2px_8px_rgba(184,115,51,0.4)]">
          <Award size={15} strokeWidth={2.25} />
        </span>
        <span className="font-display text-base font-semibold tabular text-[#b87333]">3</span>
      </span>
    );
  }
  return (
    <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center text-sm tabular text-muted">
      {rank}
    </span>
  );
}

function LeaderboardContent() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const openProfile = useCallback(async (entry: LeaderboardEntry) => {
    setSelected(entry);
    setSubs([]);
    setSubsLoading(true);
    try {
      const res = await fetch(`/api/challenges/submissions?userId=${entry.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setSubs(data.submissions ?? []);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  const closeProfile = useCallback(() => {
    setSelected(null);
    setSubs([]);
    setLightboxIndex(null);
  }, []);

  const lightboxItems = useMemo(
    () =>
      subs
        .filter((s): s is Submission & { photo_data: string } => Boolean(s.photo_data))
        .map((s) => ({
          id: s.id,
          url: s.photo_data,
          caption: s.title,
          displayName: s.display_name,
          isChallenge: true,
          points: s.points_awarded,
          mirrored: Boolean(s.is_mirrored),
          isVideo: Boolean(s.is_video),
        })),
    [subs]
  );

  if (selected) {
    const withPhoto = subs.filter(
      (s): s is Submission & { photo_data: string } => Boolean(s.photo_data)
    );
    const withoutPhoto = subs.filter((s) => !s.photo_data);

    return (
      <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-7">
        {lightboxIndex !== null && lightboxItems.length > 0 && (
          <Lightbox
            items={lightboxItems}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closeProfile}
            aria-label="Tillbaka"
            className="rounded-full p-2 text-muted transition hover:bg-black/[0.05] hover:text-cream"
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-2xl font-medium text-cream">
              {selected.display_name}
            </h1>
            <p className="text-sm text-muted">
              {selected.points} poäng · {selected.challenges_completed} utmaningar
            </p>
          </div>
        </div>

        {subsLoading ? (
          <p className="text-center text-sm text-muted">Laddar utmaningar…</p>
        ) : subs.length === 0 ? (
          <div className="card px-4 py-8 text-center">
            <p className="text-sm text-muted">Inga klarade utmaningar än.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withPhoto.length > 0 && (
              <div className="grid grid-cols-2 items-stretch gap-3">
                {withPhoto.map((s) => {
                  const lbIndex = lightboxItems.findIndex((item) => item.id === s.id);
                  return (
                    <EvidenceCard
                      key={s.id}
                      photoUrl={s.photo_data}
                      title={s.title}
                      points={s.points_awarded}
                      mirrored={Boolean(s.is_mirrored)}
                      isVideo={Boolean(s.is_video)}
                      onClick={() => {
                        if (lbIndex >= 0) setLightboxIndex(lbIndex);
                      }}
                    />
                  );
                })}
              </div>
            )}
            {withoutPhoto.length > 0 && (
              <div className="space-y-1.5">
                {withoutPhoto.map((s) => (
                  <div
                    key={s.id}
                    className="card flex w-full items-center justify-between gap-3 px-3.5 py-2.5"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-cream">
                      {s.title}
                    </p>
                    <span className="font-display shrink-0 tabular text-base font-medium text-accent-strong">
                      +{s.points_awarded}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-cream">Topplista</h1>
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
        <div className="w-full space-y-1.5">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isTop = rank === 1 && entry.points > 0;
            const isMe = entry.id === user?.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => void openProfile(entry)}
                className={`card flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-black/[0.02] active:scale-[0.99] ${
                  isTop ? "border-accent/30 bg-accent/[0.05]" : ""
                } ${isMe ? "border-l-2 border-l-accent" : ""}`}
              >
                <RankMark rank={rank} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cream">{entry.display_name}</p>
                  <p className="text-[0.7rem] leading-tight text-muted">
                    {entry.challenges_completed} utmaningar klara
                  </p>
                </div>
                <div className="font-display shrink-0 tabular text-lg font-medium text-accent-strong">
                  {entry.points}
                </div>
              </button>
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
