"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Clock, ImageOff, Images } from "lucide-react";
import CameraCapture from "../components/CameraCapture";
import Countdown from "../components/Countdown";
import EvidenceCard from "../components/EvidenceCard";
import PushOptIn from "../components/PushOptIn";
import { useAuth } from "../providers";
import { fileToCompressedDataUrl } from "@/lib/compressImage";
import type { HistoryAssignment, PendingAssignment, Submission } from "@/lib/types";
import Link from "next/link";

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
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submitPhoto(imageData: string) {
    setBusy(true);
    setError(null);
    try {
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
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await fileToCompressedDataUrl(file);
      await submitPhoto(imageData);
    } catch {
      setError("Kunde inte läsa bilden, testa en annan.");
    } finally {
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
      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => {
            setShowCamera(false);
            void submitPhoto(dataUrl);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={busy}
          className="btn-primary flex-1"
        >
          <Camera size={17} strokeWidth={1.75} />
          {busy ? "Skickar…" : "Ta bildbevis nu"}
        </button>
        <label className="btn-secondary cursor-pointer">
          <Images size={17} strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={onFile}
          />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function ChallengesContent() {
  const { refresh, user } = useAuth();
  const [pending, setPending] = useState<PendingAssignment[]>([]);
  const [history, setHistory] = useState<HistoryAssignment[]>([]);
  const [mine, setMine] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActive = useCallback(async () => {
    const res = await fetch("/api/challenges/active", { cache: "no-store" });
    const data = await res.json();
    setPending(data.pending ?? []);
    setHistory(data.history ?? []);
    setLoading(false);
  }, []);

  const loadMine = useCallback(async () => {
    const res = await fetch("/api/challenges/submissions?mine=1", { cache: "no-store" });
    const data = await res.json();
    setMine(data.submissions ?? []);
  }, []);

  useEffect(() => {
    void loadActive();
    void loadMine();
    const id = setInterval(() => void loadActive(), 5000);
    const id2 = setInterval(() => void loadMine(), 15000);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, [loadActive, loadMine]);

  const handleDone = useCallback(() => {
    void loadActive();
    void loadMine();
    void refresh();
  }, [loadActive, loadMine, refresh]);

  const missed = history.filter((h) => h.status === "expired");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-cream">Utmaningar</h1>
      </div>

      {user && <PushOptIn />}

      {!loading && pending.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Clock size={26} strokeWidth={1.25} className="text-muted" />
          <p className="font-display font-medium text-cream">
            {user ? "Ingen aktiv utmaning just nu" : "Öppna din inbjudan för att delta"}
          </p>
          <p className="text-sm text-muted">
            {user ? (
              "Håll utkik — en notis dyker upp när nästa utmaning skickas ut"
            ) : (
              <>
                Dina bildbevis syns här när du är inloggad.{" "}
                <Link href="/inbjudan" className="text-accent-strong underline-offset-2 hover:underline">
                  Till inbjudan
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((p) => (
          <ChallengeCard key={p.id} assignment={p} onDone={handleDone} />
        ))}
      </div>

      <div>
        <p className="section-label mb-3">Dina bildbevis</p>
        {mine.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ImageOff size={22} strokeWidth={1.25} className="text-muted" />
            <p className="text-sm text-muted">
              {user
                ? "Inga bildbevis ännu — klarar du en utmaning dyker den upp här"
                : "Logga in via din inbjudan för att se dina bevis"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-3">
            {mine.map((s) => (
              <EvidenceCard
                key={s.id}
                photoUrl={s.photo_data!}
                title={s.title}
                points={s.points_awarded}
              />
            ))}
          </div>
        )}
      </div>

      {missed.length > 0 && (
        <div>
          <p className="section-label mb-2">Missade</p>
          <div className="flex flex-wrap gap-2">
            {missed.map((h) => (
              <span
                key={h.id}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-xs text-muted"
              >
                {h.emoji} {h.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChallengesPage() {
  return <ChallengesContent />;
}
