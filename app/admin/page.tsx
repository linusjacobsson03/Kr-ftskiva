"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock, Lock, Send, Sparkles, X } from "lucide-react";
import AdminPasscodeGate from "../components/AdminPasscodeGate";
import type { ChallengeTemplate, ScheduleEntry, UserOption } from "@/lib/types";

/** Difficulty is derived from points, not stored separately — keeps the
 * schema simple and the label always in sync with what the challenge is
 * actually worth. Scale: 1 Lätt, 2 Medel, 3 Svår, 4+ (normally 5) Vågad —
 * matches the suggestion batch in app/api/challenges/suggestions/route.ts. */
function difficultyOf(points: number): { label: string; className: string } {
  if (points <= 1) return { label: "Lätt", className: "text-[color:var(--color-success)]" };
  if (points <= 2) return { label: "Medel", className: "text-[color:var(--color-accent)]" };
  if (points <= 3) return { label: "Svår", className: "text-[color:var(--color-accent-strong)]" };
  return { label: "Vågad", className: "text-[color:var(--color-danger)]" };
}

/** Today's date as a local "YYYY-MM-DD" string, for prefilling the scheduling time input. */
function todayLocalDateStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function targetLabel(entry: {
  target_type: "random" | "all" | "user";
  target_display_name: string | null;
}): string {
  if (entry.target_type === "all") return "Alla";
  if (entry.target_type === "user") return entry.target_display_name ?? "Okänd person";
  return "Slumpad person";
}

function statusLabel(status: ScheduleEntry["status"]): { label: string; className: string } {
  switch (status) {
    case "scheduled":
      return { label: "Schemalagd", className: "text-[color:var(--color-accent)]" };
    case "sending":
      return { label: "Skickar…", className: "text-[color:var(--color-accent-strong)]" };
    case "sent":
      return { label: "Skickad", className: "text-[color:var(--color-success)]" };
    case "canceled":
      return { label: "Avbokad", className: "text-muted" };
    case "failed":
      return { label: "Misslyckades", className: "text-danger" };
  }
}

function PendingChallengeRow({
  challenge,
  onDecided,
}: {
  challenge: ChallengeTemplate;
  onDecided: (id: number) => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const difficulty = difficultyOf(challenge.points);

  async function decide(action: "approve" | "reject") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Något gick fel.");
        return;
      }
      onDecided(challenge.id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-cream">
            <span className="mr-1.5">{challenge.emoji}</span>
            {challenge.title}
          </p>
          <span className={`chip ${difficulty.className}`}>{difficulty.label}</span>
        </div>
        {challenge.description && (
          <p className="mt-0.5 text-sm text-muted">{challenge.description}</p>
        )}
        <p className="mt-1.5 text-xs text-muted/80">
          {challenge.points}p{challenge.suggested_time ? ` · runt ${challenge.suggested_time}` : ""}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary flex-1 text-sm"
          disabled={busy !== null}
          onClick={() => decide("approve")}
        >
          <Check size={14} strokeWidth={1.75} />
          {busy === "approve" ? "…" : "Godkänn"}
        </button>
        <button
          className="btn-secondary flex-1 text-sm"
          disabled={busy !== null}
          onClick={() => decide("reject")}
        >
          <X size={14} strokeWidth={1.75} />
          {busy === "reject" ? "…" : "Avslå"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

const TARGET_OPTIONS = [
  { key: "random" as const, label: "Slumpad" },
  { key: "all" as const, label: "Alla" },
  { key: "user" as const, label: "Välj personer" },
];

function ChallengeRow({
  challenge,
  users,
  onSent,
}: {
  challenge: ChallengeTemplate;
  users: UserOption[];
  onSent: () => void;
}) {
  // One shared recipient picker feeds both "skicka nu" and "schemalägg" —
  // "Välj personer" supports one, several, or (by checking everyone) every
  // participant, including the admin's own account: /api/users lists every
  // row in `users` with nothing filtered out, admin or not.
  const [target, setTarget] = useState<"random" | "all" | "user">("random");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const [sendAt, setSendAt] = useState(
    challenge.suggested_time ? `${todayLocalDateStr()}T${challenge.suggested_time}` : ""
  );

  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  const difficulty = difficultyOf(challenge.points);

  function toggleUser(id: number) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function recipientsValid(): boolean {
    return target !== "user" || selectedUserIds.length > 0;
  }

  async function sendNow() {
    setSendMsg(null);
    if (!recipientsValid()) {
      setSendMsg("Välj minst en person.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          userIds: target === "user" ? selectedUserIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendMsg(data.error || "Kunde inte skicka.");
        return;
      }
      setSendMsg(`Skickat till ${data.sentTo} person${data.sentTo === 1 ? "" : "er"}`);
      onSent();
    } finally {
      setSending(false);
    }
  }

  async function schedule() {
    setScheduleMsg(null);
    if (!sendAt) {
      setScheduleMsg("Välj en tid först.");
      return;
    }
    if (!recipientsValid()) {
      setScheduleMsg("Välj minst en person.");
      return;
    }
    setScheduling(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendAt: new Date(sendAt).toISOString(),
          target,
          userIds: target === "user" ? selectedUserIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScheduleMsg(data.error || "Kunde inte schemalägga.");
        return;
      }
      setScheduleMsg("Schemalagd — se fliken Schema.");
      onSent();
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-cream">
            <span className="mr-1.5">{challenge.emoji}</span>
            {challenge.title}
          </p>
          <span className={`chip ${difficulty.className}`}>{difficulty.label}</span>
        </div>
        {challenge.description && (
          <p className="mt-0.5 text-sm text-muted">{challenge.description}</p>
        )}
        <p className="mt-1.5 text-xs text-muted/80">
          {challenge.points}p · skickad {challenge.times_sent}x
          {challenge.active_count > 0 && (
            <span className="ml-1 text-accent-strong">· {challenge.active_count} aktiv nu</span>
          )}
          {challenge.scheduled_count > 0 && (
            <span className="ml-1 text-accent-strong">
              · {challenge.scheduled_count} schemalagd{challenge.scheduled_count === 1 ? "" : "a"}
            </span>
          )}
        </p>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-3">
        <p className="section-label">Mottagare</p>
        <div className="flex gap-2">
          {TARGET_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTarget(opt.key)}
              className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${
                target === opt.key ? "bg-accent text-ink" : "bg-white/5 text-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {target === "user" && (
          <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-xl bg-white/5 p-1.5">
            {users.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted">Inga deltagare än.</p>
            ) : (
              users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-cream"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="h-4 w-4 accent-[color:var(--color-accent)]"
                  />
                  {u.displayName}
                </label>
              ))
            )}
            {selectedUserIds.length > 0 && (
              <p className="px-2 pt-1 text-xs text-muted">
                {selectedUserIds.length} vald{selectedUserIds.length === 1 ? "" : "a"}
              </p>
            )}
          </div>
        )}
      </div>

      <button className="btn-secondary w-full text-sm" disabled={sending} onClick={sendNow}>
        <Send size={14} strokeWidth={1.75} />
        {sending ? "Skickar…" : "Skicka nu"}
      </button>
      {sendMsg && <p className="text-sm text-accent-strong">{sendMsg}</p>}

      <div className="space-y-2 border-t border-white/10 pt-3">
        <p className="section-label">Eller schemalägg</p>
        <input
          type="datetime-local"
          className="input-field text-sm"
          value={sendAt}
          onChange={(e) => setSendAt(e.target.value)}
        />
        <button className="btn-primary w-full text-sm" disabled={scheduling} onClick={schedule}>
          <Clock size={14} strokeWidth={1.75} />
          {scheduling ? "Schemalägger…" : "Schemalägg"}
        </button>
        {challenge.suggested_time && (
          <p className="text-xs text-muted/70">Förslag: runt {challenge.suggested_time}</p>
        )}
        {scheduleMsg && <p className="text-sm text-accent-strong">{scheduleMsg}</p>}
      </div>
    </div>
  );
}

function PendingTab() {
  const [pending, setPending] = useState<ChallengeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/challenges?status=pending", { cache: "no-store" });
    const data = await res.json();
    setPending(data.challenges ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function fetchSuggestions() {
    setFetching(true);
    setNotice(null);
    try {
      const res = await fetch("/api/challenges/suggestions", { method: "POST" });
      const data = await res.json();
      await load();
      setNotice(
        data.added > 0
          ? `${data.added} nya förslag att gå igenom nedan.`
          : "Inga nya förslag — allt är redan tillagt eller behandlat."
      );
    } finally {
      setFetching(false);
    }
  }

  function handleDecided(id: number) {
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-2 p-4">
        <p className="section-label">Utmaningsförslag</p>
        <p className="text-sm text-muted">
          Hämta ett gäng färdiga förslag i olika svårighetsgrader (Lätt → Vågad) och godkänn eller
          avslå dem ett i taget. Godkända hamnar direkt i fliken <strong>Utmaningar</strong> och
          kan skickas ut eller schemaläggas därifrån.
        </p>
        <button onClick={fetchSuggestions} disabled={fetching} className="btn-primary w-full">
          <Sparkles size={14} strokeWidth={1.75} />
          {fetching ? "Hämtar…" : "Hämta förslag"}
        </button>
        {notice && <p className="text-sm text-accent-strong">{notice}</p>}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Laddar…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted">Inga förslag att godkänna just nu.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((c) => (
            <PendingChallengeRow key={c.id} challenge={c} onDecided={handleDecided} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovedTab() {
  const [challenges, setChallenges] = useState<ChallengeTemplate[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(1);
  const [emoji, setEmoji] = useState("🎯");
  const [suggestedTime, setSuggestedTime] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/challenges", { cache: "no-store" });
    const data = await res.json();
    setChallenges(data.challenges ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/users", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
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
          emoji,
          suggestedTime: suggestedTime || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Kunde inte skapa utmaningen.");
        return;
      }
      setTitle("");
      setDescription("");
      setPoints(1);
      setEmoji("🎯");
      setSuggestedTime("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
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
            <span className="mb-1.5 block text-xs text-muted">
              Poäng (1 lätt, 2 medel, 3 svår, 5 vågad)
            </span>
            <input
              type="number"
              className="input-field"
              min={1}
              max={5}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1.5 block text-xs text-muted">Passar runt (frivilligt)</span>
            <input
              type="time"
              className="input-field"
              value={suggestedTime}
              onChange={(e) => setSuggestedTime(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-muted/70">Alla utmaningar har 5 minuter på sig att lösas.</p>
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <button type="submit" disabled={creating} className="btn-primary w-full">
          {creating ? "Skapar…" : "Skapa utmaning"}
        </button>
      </form>

      <div>
        <p className="section-label mb-2">Godkända utmaningar</p>
        {loading ? (
          <p className="text-sm text-muted">Laddar…</p>
        ) : challenges.length === 0 ? (
          <p className="text-sm text-muted">
            Inga godkända utmaningar än — gå till fliken &quot;Godkänn utmaningar&quot; för att
            hämta och godkänna förslag.
          </p>
        ) : (
          <div className="space-y-3">
            {challenges.map((c) => (
              <ChallengeRow key={c.id} challenge={c} users={users} onSent={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleTab() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/schedule", { cache: "no-store" });
    const data = await res.json();
    setEntries(data.schedule ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Poll while this tab is open so a challenge flipping from "Schemalagd"
    // to "Skickad" shows up without the admin needing to switch tabs back.
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  async function cancel(id: number) {
    await fetch(`/api/schedule/${id}/cancel`, { method: "POST" });
    await load();
  }

  const upcoming = entries.filter((e) => e.status === "scheduled" || e.status === "sending");
  const history = entries.filter((e) => e.status !== "scheduled" && e.status !== "sending");

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-2">Kommande</p>
        {loading ? (
          <p className="text-sm text-muted">Laddar…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted">
            Inget schemalagt just nu — schemalägg utmaningar från fliken &quot;Utmaningar&quot;.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((e) => {
              const status = statusLabel(e.status);
              return (
                <div key={e.id} className="card space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-cream">
                      <span className="mr-1.5">{e.challenge_emoji}</span>
                      {e.challenge_title}
                    </p>
                    <span className={`chip ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {formatDateTime(e.send_at)} · {targetLabel(e)}
                  </p>
                  {e.status === "scheduled" && (
                    <button className="btn-secondary w-full text-sm" onClick={() => cancel(e.id)}>
                      <X size={14} strokeWidth={1.75} />
                      Avboka
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <p className="section-label mb-2">Historik</p>
          <div className="space-y-2">
            {history.map((e) => {
              const status = statusLabel(e.status);
              return (
                <div
                  key={e.id}
                  className="card flex items-center justify-between gap-2 p-3 text-sm"
                >
                  <span className="text-cream">
                    {e.challenge_emoji} {e.challenge_title} · {targetLabel(e)} ·{" "}
                    {formatDateTime(e.send_at)}
                  </span>
                  <span className={status.className}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminContent() {
  const [tab, setTab] = useState<"pending" | "approved" | "schedule">("pending");

  async function lock() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-cream">Admin</h1>
          <p className="mt-0.5 text-sm text-muted">
            Godkänn, skapa, schemalägg och skicka utmaningar
          </p>
        </div>
        <button onClick={lock} className="btn-ghost shrink-0">
          <Lock size={14} strokeWidth={1.75} />
          Lås
        </button>
      </div>

      <div className="card flex p-1">
        {(
          [
            { key: "pending", label: "Godkänn" },
            { key: "approved", label: "Utmaningar" },
            { key: "schedule", label: "Schema" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-accent text-ink" : "text-muted"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pending" && <PendingTab />}
      {tab === "approved" && <ApprovedTab />}
      {tab === "schedule" && <ScheduleTab />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminPasscodeGate>
      <AdminContent />
    </AdminPasscodeGate>
  );
}
