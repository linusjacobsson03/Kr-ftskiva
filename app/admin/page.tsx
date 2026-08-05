"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGate from "../components/AuthGate";
import type { ChallengeTemplate } from "@/lib/types";

function ChallengeRow({
  challenge,
  onSent,
}: {
  challenge: ChallengeTemplate;
  onSent: () => void;
}) {
  const [busy, setBusy] = useState<"all" | "random" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function send(target: "all" | "random") {
    setBusy(target);
    setMessage(null);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Kunde inte skicka.");
        return;
      }
      setMessage(`Skickat till ${data.sentTo} person${data.sentTo === 1 ? "" : "er"}! 🚀`);
      onSent();
    } finally {
      setBusy(null);
    }
  }

  const minutes = challenge.duration_seconds / 60;
  const timeLabel = Number.isInteger(minutes) ? `${minutes} min` : `${challenge.duration_seconds}s`;

  return (
    <div className="card space-y-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">
            {challenge.emoji} {challenge.title}
          </p>
          {challenge.description && (
            <p className="text-sm text-white/60">{challenge.description}</p>
          )}
          <p className="mt-1 text-xs text-white/40">
            {challenge.points}p · {timeLabel} · skickad {challenge.times_sent}x
            {challenge.active_count > 0 && (
              <span className="ml-1 text-amber-300">· {challenge.active_count} aktiv nu</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-secondary flex-1 text-sm"
          disabled={busy !== null}
          onClick={() => send("all")}
        >
          {busy === "all" ? "Skickar…" : "📣 Skicka till alla"}
        </button>
        <button
          className="btn-secondary flex-1 text-sm"
          disabled={busy !== null}
          onClick={() => send("random")}
        >
          {busy === "random" ? "Skickar…" : "🎲 Slumpad person"}
        </button>
      </div>
      {message && <p className="text-sm text-amber-300">{message}</p>}
    </div>
  );
}

function AdminContent() {
  const [challenges, setChallenges] = useState<ChallengeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(10);
  const [minutes, setMinutes] = useState(2);
  const [emoji, setEmoji] = useState("🎯");
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/challenges", { cache: "no-store" });
    const data = await res.json();
    setChallenges(data.challenges ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          points,
          durationSeconds: Math.round(minutes * 60),
          emoji,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Kunde inte skapa utmaningen.");
        return;
      }
      setTitle("");
      setDescription("");
      setPoints(10);
      setMinutes(2);
      setEmoji("🎯");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function seedDefaults() {
    setSeeding(true);
    try {
      const res = await fetch("/api/challenges/seed", { method: "POST" });
      const data = await res.json();
      await load();
      alert(data.added > 0 ? `La till ${data.added} exempel-utmaningar!` : "Alla exempel finns redan.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">🛠️ Admin</h1>
          <p className="text-white/60">Skapa och skicka ut utmaningar</p>
        </div>
        <button onClick={seedDefaults} disabled={seeding} className="btn-secondary text-sm">
          {seeding ? "…" : "✨ Exempel-utmaningar"}
        </button>
      </div>

      <form onSubmit={createChallenge} className="card space-y-3 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/50">
          Ny utmaning
        </p>
        <div className="flex gap-2">
          <input
            className="input-field w-16 text-center text-2xl"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
          />
          <input
            className="input-field flex-1"
            placeholder="Titel, t.ex. 'Kindpuss-kombo'"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <textarea
          className="input-field"
          placeholder="Beskrivning / instruktion"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
        />
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs text-white/60">Poäng</span>
            <input
              type="number"
              className="input-field"
              min={1}
              max={1000}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs text-white/60">Tid (minuter)</span>
            <input
              type="number"
              className="input-field"
              min={0.25}
              step={0.25}
              max={60}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
        </div>
        {formError && <p className="text-sm text-red-300">{formError}</p>}
        <button type="submit" disabled={creating} className="btn-primary w-full">
          {creating ? "Skapar…" : "Skapa utmaning"}
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
          Alla utmaningar
        </h2>
        {loading ? (
          <p className="text-white/50">Laddar…</p>
        ) : challenges.length === 0 ? (
          <p className="text-white/50">Inga utmaningar skapade än.</p>
        ) : (
          <div className="space-y-3">
            {challenges.map((c) => (
              <ChallengeRow key={c.id} challenge={c} onSent={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGate adminOnly>
      <AdminContent />
    </AuthGate>
  );
}
