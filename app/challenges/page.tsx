"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuthGate from "../components/AuthGate";
import Countdown from "../components/Countdown";
import { useAuth } from "../providers";
import { fileToCompressedDataUrl } from "@/lib/compressImage";
import type { HistoryAssignment, PendingAssignment, Submission } from "@/lib/types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso + "Z").getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "nyss";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} tim sedan`;
  return `${Math.floor(hours / 24)} d sedan`;
}

function ChallengeCard({
  assignment,
  onDone,
}: {
  assignment: PendingAssignment;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const imageData = await fileToCompressedDataUrl(file);
      const res = await fetch(`/api/challenges/assignments/${assignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kunde inte skicka in bilden.");
        if (res.status === 410) setTimeout(onDone, 1500);
        return;
      }
      setSuccess(data.pointsAwarded);
      setTimeout(onDone, 1600);
    } catch {
      setError("Nätverksfel, testa igen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (success !== null) {
    return (
      <div className="card p-5 text-center">
        <p className="text-4xl">🎉</p>
        <p className="mt-2 font-bold">Klarat! +{success} poäng</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3 border-2 border-amber-400/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">
          {assignment.emoji} {assignment.title}
        </p>
        <Countdown deadlineIso={assignment.deadlineIso} className="text-xl" onExpire={onDone} />
      </div>
      {assignment.description && (
        <p className="text-sm text-white/70">{assignment.description}</p>
      )}
      <p className="text-sm font-semibold text-amber-300">
        Värd {assignment.points} poäng — bildbevis krävs!
      </p>

      <label className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2">
        {busy ? "Skickar…" : "📸 Ta bildbevis nu"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={onFile}
        />
      </label>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}

function ChallengesContent() {
  const { refresh } = useAuth();
  const [pending, setPending] = useState<PendingAssignment[]>([]);
  const [history, setHistory] = useState<HistoryAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActive = useCallback(async () => {
    const res = await fetch("/api/challenges/active", { cache: "no-store" });
    const data = await res.json();
    setPending(data.pending ?? []);
    setHistory(data.history ?? []);
    setLoading(false);
  }, []);

  const loadSubmissions = useCallback(async () => {
    const res = await fetch("/api/challenges/submissions", { cache: "no-store" });
    const data = await res.json();
    setSubmissions(data.submissions ?? []);
  }, []);

  useEffect(() => {
    loadActive();
    loadSubmissions();
    const id = setInterval(loadActive, 5000);
    const id2 = setInterval(loadSubmissions, 20000);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, [loadActive, loadSubmissions]);

  const handleDone = useCallback(() => {
    loadActive();
    loadSubmissions();
    refresh();
  }, [loadActive, loadSubmissions, refresh]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-extrabold">🎯 Utmaningar</h1>
        <p className="text-white/60">Samla poäng och vinn kvällens kräftbukal!</p>
      </div>

      {!loading && pending.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-3xl">⏳</p>
          <p className="mt-2 font-semibold">Ingen aktiv utmaning just nu</p>
          <p className="mt-1 text-sm text-white/60">
            Håll utkik — en notis dyker upp när nästa utmaning skickas ut!
          </p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((p) => (
          <ChallengeCard key={p.id} assignment={p} onDone={handleDone} />
        ))}
      </div>

      {history.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
            Din historik
          </h2>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <span
                key={h.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  h.status === "completed"
                    ? "bg-green-500/15 text-green-300"
                    : "bg-white/5 text-white/40"
                }`}
              >
                {h.emoji} {h.title}{" "}
                {h.status === "completed" ? `+${h.points_awarded}p` : "⌛ missad"}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
          Bildbevis från festen
        </h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-white/50">Inga bildbevis inlämnade än.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {submissions.map((s) => (
              <div key={s.id} className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.photo_data}
                  alt={s.title}
                  className="aspect-square w-full object-cover"
                />
                <div className="space-y-0.5 p-2">
                  <p className="truncate text-xs font-semibold">
                    {s.avatar_emoji} {s.display_name}
                  </p>
                  <p className="truncate text-xs text-amber-300">
                    {s.emoji} {s.title} · +{s.points_awarded}p
                  </p>
                  <p className="text-[10px] text-white/40">{timeAgo(s.completed_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <AuthGate>
      <ChallengesContent />
    </AuthGate>
  );
}
