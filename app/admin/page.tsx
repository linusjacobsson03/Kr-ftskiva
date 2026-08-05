"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Shuffle, Sparkles } from "lucide-react";
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
      setMessage(`Skickat till ${data.sentTo} person${data.sentTo === 1 ? "" : "er"}`);
      onSent();
    } finally {
      setBusy(null);
    }
  }

  const minutes = challenge.duration_seconds / 60;
  const timeLabel = Number.isInteger(minutes) ? `${minutes} min` : `${challenge.duration_seconds}s`;

  return (
    <div className="card space-y-3 p-4">
      <div>
        <p className="font-medium text-cream">
          <span className="mr-1.5">{challenge.emoji}</span>
          {challenge.title}
        </p>
        {challenge.description && (
          <p className="mt-0.5 text-sm text-muted">{challenge.description}</p>
        )}
        <p className="mt-1.5 text-xs text-muted/80">
          {challenge.points}p · {timeLabel} · skickad {challenge.times_sent}x
          {challenge.active_count > 0 && (
            <span className="ml-1 text-accent-strong">· {challenge.active_count} aktiv nu</span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-secondary flex-1 text-sm"
          disabled={busy !== null}
          onClick={() => send("all")}
        >
          <Send size={14} strokeWidth={1.75} />
          {busy === "all" ? "Skickar…" : "Alla"}
        </button>
        <button
          className="btn-secondary flex-1 text-sm"
          disabled={busy !== null}
          onClick={() => send("random")}
        >
          <Shuffle size={14} strokeWidth={1.75} />
          {busy === "random" ? "Skickar…" : "Slumpad person"}
        </button>
      </div>
      {message && <p className="text-sm text-accent-strong">{message}</p>}
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
      alert(data.added > 0 ? `La till ${data.added} exempel-utmaningar` : "Alla exempel finns redan.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-cream">Admin</h1>
          <p className="mt-0.5 text-sm text-muted">Skapa och skicka ut utmaningar</p>
        </div>
        <button onClick={seedDefaults} disabled={seeding} className="btn-secondary shrink-0 text-sm">
          <Sparkles size={14} strokeWidth={1.75} />
          {seeding ? "…" : "Exempel"}
        </button>
      </div>

      <form onSubmit={createChallenge} className="card space-y-3 p-4">
        <p className="section-label">Ny utmaning</p>
        <div className="flex gap-2">
          <input
            className="input-field w-16 text-center text-xl"
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
            <span className="mb-1.5 block text-xs text-muted">Poäng</span>
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
            <span className="mb-1.5 block text-xs text-muted">Tid (minuter)</span>
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
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <button type="submit" disabled={creating} className="btn-primary w-full">
          {creating ? "Skapar…" : "Skapa utmaning"}
        </button>
      </form>

      <div>
        <p className="section-label mb-2">Alla utmaningar</p>
        {loading ? (
          <p className="text-sm text-muted">Laddar…</p>
        ) : challenges.length === 0 ? (
          <p className="text-sm text-muted">Inga utmaningar skapade än.</p>
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
