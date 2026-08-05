"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Clock, ImageOff } from "lucide-react";
import AuthGate from "../components/AuthGate";
import Avatar from "../components/Avatar";
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
      <div className="card flex flex-col items-center gap-2 p-6 text-center">
        <CheckCircle2 size={30} strokeWidth={1.25} className="text-success" />
        <p className="font-display text-lg font-medium text-cream">
          Klarat! +{success} poäng
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-3 border-l-2 border-l-accent bg-accent/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-lg font-medium text-cream">
          <span className="mr-1.5">{assignment.emoji}</span>
          {assignment.title}
        </p>
        <Countdown
          deadlineIso={assignment.deadlineIso}
          className="shrink-0 text-xl text-accent-strong"
          onExpire={onDone}
        />
      </div>
      {assignment.description && (
        <p className="text-sm text-muted">{assignment.description}</p>
      )}
      <p className="chip">Värd {assignment.points} poäng</p>

      <label className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2">
        <Camera size={17} strokeWidth={1.75} />
        {busy ? "Skickar…" : "Ta bildbevis nu"}
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
      {error && <p className="text-sm text-danger">{error}</p>}
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
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-7">
      <div>
        <h1 className="font-display text-2xl font-medium text-cream">Utmaningar</h1>
        <p className="mt-0.5 text-sm text-muted">
          Samla poäng och vinn kvällens kräftbukal
        </p>
      </div>

      {!loading && pending.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Clock size={26} strokeWidth={1.25} className="text-muted" />
          <p className="font-display font-medium text-cream">Ingen aktiv utmaning just nu</p>
          <p className="text-sm text-muted">
            Håll utkik — en notis dyker upp när nästa utmaning skickas ut
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
          <p className="section-label mb-2">Din historik</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <span
                key={h.id}
                className={
                  h.status === "completed"
                    ? "chip"
                    : "inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-muted"
                }
              >
                {h.emoji} {h.title}{" "}
                {h.status === "completed" ? `+${h.points_awarded}p` : "missad"}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="section-label mb-2">Bildbevis från festen</p>
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ImageOff size={22} strokeWidth={1.25} className="text-muted" />
            <p className="text-sm text-muted">Inga bildbevis inlämnade än</p>
          </div>
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
                <div className="space-y-1 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={s.display_name} size={16} />
                    <p className="truncate text-xs font-medium text-cream">
                      {s.display_name}
                    </p>
                  </div>
                  <p className="truncate text-xs text-accent-strong">
                    {s.emoji} {s.title} · +{s.points_awarded}p
                  </p>
                  <p className="text-[10px] text-muted/70">{timeAgo(s.completed_at)}</p>
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
