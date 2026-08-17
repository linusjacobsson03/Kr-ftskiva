"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, ChevronDown, Clock, Copy, ListPlus, Lock, MessageSquare, PartyPopper, Send, Sparkles, Trash2, UserPlus, X } from "lucide-react";
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

function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isoDayKey(iso: string): string {
  return dayKeyFromDate(new Date(iso));
}

function upcomingDays(count = 5, from = startOfLocalDay()) {
  const today = startOfLocalDay(from);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const weekday = date
      .toLocaleDateString("sv-SE", { weekday: "long" })
      .replace(/^./, (c) => c.toUpperCase());
    const label = offset === 0 ? "Idag" : offset === 1 ? "Imorgon" : weekday;
    return {
      offset,
      key: dayKeyFromDate(date),
      label,
      dateLabel: `${date.getDate()}/${date.getMonth() + 1}`,
    };
  });
}

function msUntilNextLocalMidnight(now = new Date()) {
  const next = startOfLocalDay(now);
  next.setDate(next.getDate() + 1);
  return Math.max(250, next.getTime() - now.getTime() + 250);
}

/** Live calendar day — rolls over at midnight even if the tab stays open. */
function useTodayKey() {
  const [todayKey, setTodayKey] = useState(() => dayKeyFromDate(new Date()));

  useEffect(() => {
    function sync() {
      setTodayKey(dayKeyFromDate(new Date()));
    }

    let timeout: ReturnType<typeof setTimeout>;
    function scheduleMidnight() {
      timeout = setTimeout(() => {
        sync();
        scheduleMidnight();
      }, msUntilNextLocalMidnight());
    }

    scheduleMidnight();
    const interval = setInterval(sync, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return todayKey;
}

function DayPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const todayKey = useTodayKey();
  const days = useMemo(
    () => upcomingDays(5, parseDayKey(todayKey)),
    [todayKey]
  );

  useEffect(() => {
    if (!days.some((d) => d.key === value)) {
      onChange(todayKey);
    }
  }, [days, onChange, todayKey, value]);

  return (
    <div className="grid grid-cols-5 gap-1">
      {days.map((d) => {
        const active = value === d.key;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onChange(d.key)}
            className={`flex min-w-0 flex-col items-center rounded-2xl px-1 py-2 text-center transition ${
              active
                ? "bg-accent text-ink"
                : "border border-black/10 bg-white text-cream hover:bg-black/[0.03]"
            }`}
          >
            <span className="w-full truncate text-[0.65rem] font-semibold leading-tight">
              {d.label}
            </span>
            <span
              className={`mt-0.5 text-[0.65rem] tabular ${
                active ? "text-ink/70" : "text-muted"
              }`}
            >
              {d.dateLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function buildSendAtIsoFromTime(hhmm: string, day = dayKeyFromDate(new Date())): string | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const d = parseDayKey(day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const SLIDER_START_MIN = 10 * 60;
const SLIDER_END_MIN = 23 * 60;
const SLIDER_STEP_MIN = 1;

function minutesToHhmm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
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
          <p className="font-medium text-cream">{challenge.title}</p>
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

export interface Recipients {
  target: "random" | "all" | "user";
  selectedUserIds: number[];
}

function recipientsValid(r: Recipients): boolean {
  return r.target !== "user" || r.selectedUserIds.length > 0;
}

/**
 * Compact "pick who gets this" control — a single small dropdown instead of
 * a bank of pill buttons plus an always-visible checkbox panel, so it fits
 * comfortably next to the emoji field on the "Ny utmaning" form. Doubles as
 * the mottagare-picker on already-approved challenges below. One tap for
 * "Slumpad"/"Alla", or check any number of individual people — the admin's
 * own account is just another row in `users`, nothing excludes it, so
 * picking yourself works the same as picking anyone else.
 */
function RecipientDropdown({
  users,
  value,
  onChange,
  label,
}: {
  users: UserOption[];
  value: Recipients;
  onChange: (next: Recipients) => void;
  label?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  function pickSingle(target: "random" | "all") {
    onChange({ target, selectedUserIds: [] });
    close();
  }

  function toggleUser(id: number) {
    const current = value.target === "user" ? value.selectedUserIds : [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ target: "user", selectedUserIds: next });
  }

  const summary =
    value.target === "random"
      ? "Slumpad"
      : value.target === "all"
      ? "Alla"
      : value.selectedUserIds.length === 0
      ? "Välj spelare"
      : `${value.selectedUserIds.length} vald${value.selectedUserIds.length === 1 ? "" : "a"}`;

  return (
    <details ref={detailsRef} className="group relative min-w-0 flex-1">
      {label && <span className="mb-1.5 block text-xs text-muted">{label}</span>}
      <summary className="input-field flex list-none items-center justify-between gap-1 text-sm [&::-webkit-details-marker]:hidden">
        <span className="truncate">{summary}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className="shrink-0 text-muted transition group-open:rotate-180"
        />
      </summary>
      <div className="absolute right-0 top-full z-10 mt-1 w-56 space-y-0.5 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => pickSingle("random")}
          className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
            value.target === "random" ? "bg-accent text-ink" : "text-cream"
          }`}
        >
          Slumpad person
        </button>
        <button
          type="button"
          onClick={() => pickSingle("all")}
          className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
            value.target === "all" ? "bg-accent text-ink" : "text-cream"
          }`}
        >
          Alla
        </button>
        <div className="my-1 border-t border-black/10" />
        <div className="max-h-40 overflow-y-auto">
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
                  checked={value.target === "user" && value.selectedUserIds.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="h-4 w-4 accent-[color:var(--color-accent)]"
                />
                {u.displayName}
              </label>
            ))
          )}
        </div>
      </div>
    </details>
  );
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TIMELINE_START_H = 10;
const TIMELINE_END_H = 23;
const TIMELINE_HOURS = TIMELINE_END_H - TIMELINE_START_H;

function hourOffset(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function EveningTimeline({
  entries,
  users,
  selectedDay,
  onCancel,
  onSaved,
}: {
  entries: ScheduleEntry[];
  users: UserOption[];
  selectedDay: string;
  onCancel: (id: number) => void;
  onSaved: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const visible = entries
    .filter((e) => e.status === "scheduled" || e.status === "sending" || e.status === "sent")
    .filter((e) => isoDayKey(e.send_at) === selectedDay)
    .slice()
    .sort((a, b) => new Date(a.send_at).getTime() - new Date(b.send_at).getTime());

  const now = new Date();
  const nowH = hourOffset(now);
  const isToday = selectedDay === dayKeyFromDate(now);
  const showNow =
    isToday && nowH >= TIMELINE_START_H && nowH <= TIMELINE_END_H && visible.length > 0;

  const hourMarks = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => TIMELINE_START_H + i);

  // Insert each challenge under the hour block it belongs to (16, 17, …).
  const byHour = new Map<number, ScheduleEntry[]>();
  for (const h of hourMarks.slice(0, -1)) byHour.set(h, []);
  const outside: ScheduleEntry[] = [];
  for (const e of visible) {
    const h = Math.floor(hourOffset(new Date(e.send_at)));
    if (h >= TIMELINE_START_H && h < TIMELINE_END_H) {
      byHour.get(h)!.push(e);
    } else if (h === TIMELINE_END_H) {
      // Exactly 22:00 → last hour bucket visually under 21–22
      byHour.get(TIMELINE_END_H - 1)!.push(e);
    } else {
      outside.push(e);
    }
  }

  return (
    <div className="card max-w-full space-y-3 overflow-x-hidden p-3">
      <div>
        <p className="section-label">Kvällens tidslinje</p>
        <p className="mt-1 text-sm text-muted">
          {TIMELINE_START_H}:00–{TIMELINE_END_H}:00 — tryck på en utmaning för att ändra.
        </p>
      </div>

      <div className="relative min-w-0 space-y-0 overflow-x-hidden pl-1">
        {hourMarks.slice(0, -1).map((h) => {
          const items = byHour.get(h) ?? [];
          const nowInBucket = showNow && Math.floor(nowH) === h;
          return (
            <div key={h} className="relative min-w-0 border-l border-black/10 pl-3">
              <div className="absolute -left-[4px] top-1 h-2 w-2 rounded-full border-2 border-black/15 bg-white" />
              <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-2">
                <p className="font-display shrink-0 text-xs font-semibold tabular text-muted">
                  {String(h).padStart(2, "0")}:00
                </p>
                {nowInBucket && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[0.65rem] font-semibold text-danger">
                    Nu {formatClock(now.toISOString())}
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <p className="mb-3 text-[0.65rem] text-muted/50">—</p>
              ) : (
                <div className="mb-3 min-w-0 space-y-1">
                  {items.map((entry) => {
                    const sent = entry.status === "sent";
                    const sending = entry.status === "sending";
                    const open = editingId === entry.id;
                    return (
                      <div key={entry.id} className="min-w-0">
                        <div
                          className={`flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-xl border px-2 py-1.5 ${
                            sent
                              ? "border-success/25 bg-success/[0.08]"
                              : sending
                                ? "border-accent/40 bg-accent/15"
                                : open
                                  ? "border-accent/50 bg-accent/10"
                                  : "border-black/10 bg-white"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingId(open ? null : entry.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <span className="font-display w-10 shrink-0 text-xs font-semibold tabular text-accent-strong">
                              {formatClock(entry.send_at)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-cream">
                                {entry.challenge_title}
                              </p>
                              <p className="truncate text-[0.65rem] text-muted">
                                {sent ? "Skickad" : sending ? "Skickar" : "Till"}{" "}
                                {targetLabel(entry)}
                              </p>
                            </div>
                          </button>
                          {entry.status === "scheduled" && (
                            <button
                              type="button"
                              onClick={() => onCancel(entry.id)}
                              className="shrink-0 rounded-full p-1 text-muted transition hover:bg-black/[0.05] hover:text-danger"
                              aria-label="Avboka"
                              title="Avboka"
                            >
                              <X size={12} strokeWidth={1.75} />
                            </button>
                          )}
                        </div>
                        {open && (
                          <ScheduleEntryEditor
                            entry={entry}
                            users={users}
                            onClose={() => setEditingId(null)}
                            onSaved={() => {
                              setEditingId(null);
                              onSaved();
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="relative border-l border-transparent pl-3">
          <div className="absolute -left-[4px] top-1 h-2 w-2 rounded-full border-2 border-black/15 bg-white" />
          <p className="font-display text-xs font-semibold tabular text-muted">
            {String(TIMELINE_END_H).padStart(2, "0")}:00
          </p>
        </div>
      </div>

      {visible.length === 0 && (
        <p className="text-center text-sm text-muted">
          Inget schemalagt den här dagen.
        </p>
      )}

      {outside.length > 0 && (
        <div className="space-y-1.5 border-t border-black/10 pt-3">
          <p className="text-xs text-muted">
            Utanför {TIMELINE_START_H}–{TIMELINE_END_H}
          </p>
          {outside.map((e) => (
            <p key={e.id} className="text-sm text-cream">
              <span className="font-display tabular text-accent-strong">{formatClock(e.send_at)}</span>
              {" · "}
              {e.challenge_title}
              {" · "}
              {targetLabel(e)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleEntryEditor({
  entry,
  users,
  onClose,
  onSaved,
}: {
  entry: ScheduleEntry;
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const canSchedule = entry.status === "scheduled";
  const [title, setTitle] = useState(entry.challenge_title);
  const [minutes, setMinutes] = useState(() => isoToMinutes(entry.send_at));
  const [day, setDay] = useState(() => isoDayKey(entry.send_at));
  const [recipients, setRecipients] = useState<Recipients>(() =>
    entry.target_type === "user" && entry.target_user_id
      ? { target: "user", selectedUserIds: [entry.target_user_id] }
      : { target: entry.target_type === "all" ? "all" : "random", selectedUserIds: [] }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Skriv en text.");
      return;
    }
    if (canSchedule && !recipientsValid(recipients)) {
      setError("Välj minst en person.");
      return;
    }
    setBusy(true);
    try {
      const body: {
        title: string;
        sendAt?: string;
        target?: Recipients["target"];
        userIds?: number[];
      } = { title: title.trim() };
      if (canSchedule) {
        body.sendAt = buildSendAtIsoFromTime(minutesToHhmm(minutes), day) ?? undefined;
        body.target = recipients.target;
        body.userIds = recipients.target === "user" ? recipients.selectedUserIds : undefined;
      }
      const res = await fetch(`/api/schedule/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kunde inte spara.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-1 space-y-3 rounded-xl border border-black/10 bg-white p-3">
      <label className="block text-sm">
        <span className="mb-1.5 block text-xs text-muted">Text</span>
        <input
          className="input-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
        />
      </label>
      {canSchedule ? (
        <>
          <div>
            <span className="mb-1.5 block text-xs text-muted">Dag</span>
            <DayPicker value={day} onChange={setDay} />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">Tid</span>
              <span className="font-display text-base font-semibold tabular text-accent-strong">
                {minutesToHhmm(minutes)}
              </span>
            </div>
            <input
              type="range"
              className="time-slider"
              min={SLIDER_START_MIN}
              max={SLIDER_END_MIN}
              step={SLIDER_STEP_MIN}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>
          <RecipientDropdown
            users={users}
            value={recipients}
            onChange={setRecipients}
            label="Skicka till"
          />
        </>
      ) : (
        <p className="text-xs text-muted">Redan skickad — du kan bara ändra texten.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary flex-1 text-sm">
          {busy ? "Sparar…" : "Spara"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-sm">
          Stäng
        </button>
      </div>
    </form>
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
          avslå dem ett i taget. Godkända kan sedan schemaläggas under fliken{" "}
          <strong>Schema</strong>.
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
  const [users, setUsers] = useState<UserOption[]>([]);
  const [recipients, setRecipients] = useState<Recipients>({
    target: "random",
    selectedUserIds: [],
  });
  const [title, setTitle] = useState("");
  // "HH:MM", blank = skicka direkt vid skapande. Datumet kommer från
  // dagsväljaren (Idag / Imorgon / …).
  const [sendTime, setSendTime] = useState("");
  const [sendDay, setSendDay] = useState(() => dayKeyFromDate(new Date()));
  const [points, setPoints] = useState(1);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPoints, setBulkPoints] = useState(1);
  const [bulkRecipients, setBulkRecipients] = useState<Recipients>({
    target: "random",
    selectedUserIds: [],
  });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkFromMin, setBulkFromMin] = useState(16 * 60);
  const [bulkToMin, setBulkToMin] = useState(19 * 60);
  const [bulkDay, setBulkDay] = useState(() => dayKeyFromDate(new Date()));

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
  }, []);

  /** Combines the chosen "HH:MM" with the selected day — null if left blank. */
  function buildSendAtIso(): string | null {
    return sendTime ? buildSendAtIsoFromTime(sendTime, sendDay) : null;
  }

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!recipientsValid(recipients)) {
      setFormError("Välj minst en spelare, eller byt till Slumpad/Alla.");
      return;
    }
    setCreating(true);
    try {
      const createRes = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, points }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setFormError(createData.error || "Kunde inte skapa utmaningen.");
        return;
      }
      const challengeId = createData.challenge.id;
      const dispatchBody = {
        target: recipients.target,
        userIds: recipients.target === "user" ? recipients.selectedUserIds : undefined,
      };
      const sendAtIso = buildSendAtIso();

      if (sendAtIso) {
        const res = await fetch(`/api/challenges/${challengeId}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...dispatchBody, sendAt: sendAtIso }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(`Utmaningen skapades men kunde inte schemaläggas: ${data.error ?? "okänt fel"}`);
          return;
        }
        setFormSuccess(`Utmaningen skapades och syns under Schema ${upcomingDays(5).find((d) => d.key === sendDay)?.label ?? ""} kl ${sendTime}.`);
      } else {
        const res = await fetch(`/api/challenges/${challengeId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dispatchBody),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(`Utmaningen skapades men kunde inte skickas: ${data.error ?? "okänt fel"}`);
          return;
        }
        const base = `Utmaningen skapades och skickades till ${data.sentTo} person${data.sentTo === 1 ? "" : "er"}`;
        setFormSuccess(
          data.pushWarning
            ? `${base}. ${data.pushWarning}`
            : data.pushesDelivered > 0
              ? `${base} (${data.pushesDelivered} notis${data.pushesDelivered === 1 ? "" : "er"}).`
              : `${base}.`
        );
      }

      setRecipients({ target: "random", selectedUserIds: [] });
      setTitle("");
      setSendTime("");
      setPoints(1);
    } finally {
      setCreating(false);
    }
  }

  async function createBulk(e: React.FormEvent) {
    e.preventDefault();
    setBulkError(null);
    setBulkSuccess(null);
    const titles = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (titles.length === 0) {
      setBulkError("Skriv minst en utmaning (en per rad).");
      return;
    }
    if (!recipientsValid(bulkRecipients)) {
      setBulkError("Välj minst en spelare, eller byt till Slumpad/Alla.");
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch("/api/challenges/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titles,
          points: bulkPoints,
          target: bulkRecipients.target,
          userIds: bulkRecipients.target === "user" ? bulkRecipients.selectedUserIds : undefined,
          fromTime: minutesToHhmm(bulkFromMin),
          toTime: minutesToHhmm(bulkToMin),
          day: bulkDay,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkError(data.error || "Kunde inte lägga in utmaningarna.");
        return;
      }
      setBulkText("");
      setBulkSuccess(
        `${data.count} utmaningar inlagda ${upcomingDays(5).find((d) => d.key === bulkDay)?.label ?? ""} slumpmässigt mellan ${minutesToHhmm(Math.min(bulkFromMin, bulkToMin))} och ${minutesToHhmm(Math.max(bulkFromMin, bulkToMin))}.`
      );
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            showBulk
              ? "bg-accent text-ink"
              : "border border-black/12 text-muted hover:bg-black/[0.03]"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <ListPlus size={13} strokeWidth={2} />
            Bulk utmaningar
          </span>
        </button>
      </div>

      {showBulk && (
        <form onSubmit={createBulk} className="card space-y-3 p-4">
          <p className="section-label">Bulk utmaningar</p>
          <p className="text-sm text-muted">
            En utmaning per rad. Skriv 1–5 i slutet för poäng, t.ex. &quot;Kindpuss 5&quot;.
            Utan siffra används poängen du valt under.
          </p>
          <textarea
            className="input-field min-h-40 resize-y"
            placeholder={"Kindpuss-kombo 5\nSkål för kräftorna 1\nDansa med en främling"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <RecipientDropdown
            users={users}
            value={bulkRecipients}
            onChange={setBulkRecipients}
            label="Mottagare"
          />
          <div>
            <span className="mb-1.5 block text-xs text-muted">Dag</span>
            <DayPicker value={bulkDay} onChange={setBulkDay} />
          </div>
          <div className="space-y-4">
            <span className="block text-xs text-muted">Skicka slumpmässigt mellan</span>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted">Från</span>
                <span className="font-display text-base font-semibold tabular text-accent-strong">
                  {minutesToHhmm(bulkFromMin)}
                </span>
              </div>
              <input
                type="range"
                className="time-slider"
                min={SLIDER_START_MIN}
                max={SLIDER_END_MIN}
                step={SLIDER_STEP_MIN}
                value={bulkFromMin}
                onChange={(e) => setBulkFromMin(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted">Till</span>
                <span className="font-display text-base font-semibold tabular text-accent-strong">
                  {minutesToHhmm(bulkToMin)}
                </span>
              </div>
              <input
                type="range"
                className="time-slider"
                min={SLIDER_START_MIN}
                max={SLIDER_END_MIN}
                step={SLIDER_STEP_MIN}
                value={bulkToMin}
                onChange={(e) => setBulkToMin(Number(e.target.value))}
              />
              <div className="flex justify-between text-[0.65rem] tabular text-muted">
                <span>{minutesToHhmm(SLIDER_START_MIN)}</span>
                <span>{minutesToHhmm(SLIDER_END_MIN)}</span>
              </div>
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs text-muted">
              Poäng — {difficultyOf(bulkPoints).label}
            </span>
            <div className="flex items-center justify-between gap-2">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBulkPoints(n)}
                  aria-pressed={bulkPoints === n}
                  className={`flex aspect-square min-h-12 flex-1 items-center justify-center rounded-full text-base font-semibold tabular transition ${
                    bulkPoints === n
                      ? "bg-accent text-ink shadow-[0_4px_14px_-4px_rgba(168,127,58,0.55)]"
                      : "border border-black/12 bg-white text-muted hover:bg-black/[0.03]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {bulkError && <p className="text-sm text-danger">{bulkError}</p>}
          {bulkSuccess && <p className="text-sm text-accent-strong">{bulkSuccess}</p>}
          <button type="submit" disabled={bulkBusy} className="btn-primary w-full">
            <Clock size={14} strokeWidth={1.75} />
            {bulkBusy ? "Lägger in…" : "Lägg in i schema"}
          </button>
        </form>
      )}

      <form onSubmit={createChallenge} className="card space-y-3 p-4">
      <p className="section-label">Ny utmaning</p>
      <RecipientDropdown
        users={users}
        value={recipients}
        onChange={setRecipients}
        label="Mottagare"
      />
      <input
        className="input-field"
        placeholder="Utmaning, t.ex. 'Kindpuss-kombo'"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        required
      />
      <div>
        <span className="mb-1.5 block text-xs text-muted">
          Poäng — {difficultyOf(points).label}
        </span>
        <div className="flex items-center justify-between gap-2">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPoints(n)}
              aria-pressed={points === n}
              className={`flex aspect-square min-h-12 flex-1 items-center justify-center rounded-full text-base font-semibold tabular transition ${
                points === n
                  ? "bg-accent text-ink shadow-[0_4px_14px_-4px_rgba(168,127,58,0.55)]"
                  : "border border-black/12 bg-white text-muted hover:bg-black/[0.03]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <span className="block text-xs text-muted">Tid</span>
        <DayPicker value={sendDay} onChange={setSendDay} />
        <button
          type="button"
          onClick={() => setSendTime("")}
          className={`w-full rounded-full py-2.5 text-sm font-medium transition ${
            !sendTime
              ? "bg-accent text-ink"
              : "border border-black/12 bg-white text-muted hover:bg-black/[0.03]"
          }`}
        >
          Skicka direkt
        </button>
        <div className={`space-y-2 ${sendTime ? "" : "opacity-55"}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted">Eller dra för att välja tid</span>
            <span className="font-display text-lg font-semibold tabular text-accent-strong">
              {sendTime || minutesToHhmm(18 * 60)}
            </span>
          </div>
          <input
            type="range"
            className="time-slider"
            min={SLIDER_START_MIN}
            max={SLIDER_END_MIN}
            step={SLIDER_STEP_MIN}
            value={sendTime ? hhmmToMinutes(sendTime) : 18 * 60}
            onChange={(e) => setSendTime(minutesToHhmm(Number(e.target.value)))}
          />
          <div className="flex justify-between text-[0.65rem] tabular text-muted">
            <span>{minutesToHhmm(SLIDER_START_MIN)}</span>
            <span>{minutesToHhmm(SLIDER_END_MIN)}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted/70">Alla utmaningar har 5 minuter på sig att lösas.</p>
      {formError && <p className="text-sm text-danger">{formError}</p>}
      {formSuccess && <p className="text-sm text-accent-strong">{formSuccess}</p>}
      <button type="submit" disabled={creating} className="btn-primary w-full">
        <Send size={14} strokeWidth={1.75} />
        {creating ? "Skapar…" : sendTime ? "Skapa och schemalägg" : "Skapa och skicka nu"}
      </button>
    </form>
    </div>
  );
}


function ScheduleTab() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(() => dayKeyFromDate(new Date()));

  const load = useCallback(async () => {
    const res = await fetch("/api/schedule", { cache: "no-store" });
    const data = await res.json();
    setEntries(data.schedule ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    fetch("/api/users", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []));
    const interval = setInterval(() => void load(), 20000);
    return () => clearInterval(interval);
  }, [load]);

  async function cancel(id: number) {
    await fetch(`/api/schedule/${id}/cancel`, { method: "POST" });
    await load();
  }

  const history = entries.filter(
    (e) =>
      (e.status === "canceled" || e.status === "failed") && isoDayKey(e.send_at) === selectedDay
  );

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <DayPicker value={selectedDay} onChange={setSelectedDay} />
      {loading ? (
        <p className="text-sm text-muted">Laddar schema…</p>
      ) : (
        <EveningTimeline
          entries={entries}
          users={users}
          selectedDay={selectedDay}
          onCancel={(id) => void cancel(id)}
          onSaved={() => void load()}
        />
      )}

      {history.length > 0 && (
        <div>
          <p className="section-label mb-2">Avbokade och misslyckade</p>
          <div className="space-y-2">
            {history.map((e) => {
              const status = statusLabel(e.status);
              return (
                <div
                  key={e.id}
                  className="card flex min-w-0 items-start justify-between gap-2 overflow-hidden p-2.5 text-xs"
                >
                  <span className="min-w-0 break-words text-cream">
                    {e.challenge_title} · {targetLabel(e)} ·{" "}
                    {formatDateTime(e.send_at)}
                  </span>
                  <span className={`${status.className} shrink-0`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const RSVP_SORT: Record<"yes" | "maybe" | "no", number> = { yes: 0, maybe: 1, no: 2 };

function GuestsTab() {
  const [name, setName] = useState("");
  const [guests, setGuests] = useState<
    {
      id: number;
      displayName: string;
      inviteUrl: string | null;
      rsvpStatus: "yes" | "maybe" | "no" | null;
      pushEnabled: boolean;
      pushSubscriptions: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [partyBusy, setPartyBusy] = useState(false);
  const [partyLive, setPartyLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [testPushId, setTestPushId] = useState<number | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [rsvpFilter, setRsvpFilter] = useState<"all" | "yes" | "maybe" | "no" | "none">("all");

  const counts = useMemo(() => {
    const n = { all: guests.length, yes: 0, maybe: 0, no: 0, none: 0 };
    for (const g of guests) {
      if (g.rsvpStatus === "yes") n.yes += 1;
      else if (g.rsvpStatus === "maybe") n.maybe += 1;
      else if (g.rsvpStatus === "no") n.no += 1;
      else n.none += 1;
    }
    return n;
  }, [guests]);

  const visibleGuests = useMemo(() => {
    const filtered =
      rsvpFilter === "all"
        ? guests
        : rsvpFilter === "none"
          ? guests.filter((g) => g.rsvpStatus == null)
          : guests.filter((g) => g.rsvpStatus === rsvpFilter);
    return [...filtered].sort((a, b) => {
      const ar = a.rsvpStatus == null ? 3 : RSVP_SORT[a.rsvpStatus];
      const br = b.rsvpStatus == null ? 3 : RSVP_SORT[b.rsvpStatus];
      if (ar !== br) return ar - br;
      return a.displayName.localeCompare(b.displayName, "sv");
    });
  }, [guests, rsvpFilter]);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    try {
      const [guestsRes, partyRes] = await Promise.all([
        fetch("/api/admin/guests", { cache: "no-store" }),
        fetch("/api/admin/party-mode", { cache: "no-store" }),
      ]);
      const guestsData = await guestsRes.json();
      const partyData = await partyRes.json();
      if (!guestsRes.ok) {
        setError(guestsData.error || "Kunde inte hämta gäster.");
        return;
      }
      setGuests(guestsData.guests ?? []);
      if (partyRes.ok) setPartyLive(!!partyData.partyLive);
      setError(null);
    } catch {
      setError("Kunde inte nå servern.");
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load({ quiet: true }), 8000);
    return () => clearInterval(id);
  }, [load]);

  async function togglePartyLive() {
    setPartyBusy(true);
    setError(null);
    const next = !partyLive;
    try {
      const res = await fetch("/api/admin/party-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyLive: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kunde inte uppdatera.");
        return;
      }
      setPartyLive(!!data.partyLive);
    } catch {
      setError("Kunde inte nå servern.");
    } finally {
      setPartyBusy(false);
    }
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kunde inte skapa gästen.");
        return;
      }
      setName("");
      await load();
    } catch {
      setError("Kunde inte nå servern.");
    } finally {
      setBusy(false);
    }
  }

  async function removeGuest(id: number) {
    if (!confirm("Ta bort gästen och deras inbjudningslänk?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/guests/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Kunde inte ta bort.");
        return;
      }
      await load();
    } catch {
      setError("Kunde inte nå servern.");
    }
  }

  async function testPush(id: number) {
    setTestPushId(id);
    setTestMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/guests/${id}/test-push`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Kunde inte skicka testnotis.");
        return;
      }
      setTestMsg(`Testnotis skickad till ${guests.find((g) => g.id === id)?.displayName ?? "gästen"}.`);
      setTimeout(() => setTestMsg(null), 4000);
    } catch {
      setError("Kunde inte nå servern.");
    } finally {
      setTestPushId(null);
    }
  }

  function smsHref(guest: { displayName: string; inviteUrl: string | null }) {
    if (!guest.inviteUrl) return "#";
    const body = `Hej ${guest.displayName}! Du är inbjuden till en personalaktivitet på Lilla Brattön. Öppna din personliga inbjudan här: ${guest.inviteUrl}`;
    return `sms:?&body=${encodeURIComponent(body)}`;
  }

  async function copyLink(guest: { id: number; inviteUrl: string | null }) {
    if (!guest.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(guest.inviteUrl);
      setCopiedId(guest.id);
      setTimeout(() => setCopiedId((cur) => (cur === guest.id ? null : cur)), 1600);
    } catch {
      setError("Kunde inte kopiera — markera länken manuellt.");
    }
  }

  return (
    <div className="space-y-5">
      <div
        className={`card space-y-3 p-5 ${
          partyLive ? "border-accent/35 bg-accent/[0.07]" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <PartyPopper
            size={20}
            strokeWidth={1.75}
            className={`mt-0.5 shrink-0 ${partyLive ? "text-accent-strong" : "text-muted"}`}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-cream">
              {partyLive ? "Kvällen är igång" : "Inför kvällen"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {partyLive
                ? "Gästernas inbjudningslänkar går rakt in i appen — ingen inbjudningssida."
                : "När det är dags: tryck här så landar gästerna direkt i appen när de öppnar sin länk."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={togglePartyLive}
          disabled={partyBusy}
          className={partyLive ? "btn-secondary w-full" : "btn-primary w-full"}
        >
          {partyBusy
            ? "…"
            : partyLive
              ? "Visa inbjudan igen"
              : "Öppna appen för gästerna"}
        </button>
      </div>

      <div className="card space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-cream">Lägg till gäst</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Skriv namnet och skapa ett konto med unik länk. Dela via SMS — gästen
            öppnar länken och är inloggad direkt, utan att skapa konto själv.
          </p>
        </div>
        <form onSubmit={addGuest} className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Förnamn Efternamn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
          <button type="submit" disabled={busy || !name.trim()} className="btn-primary shrink-0">
            <UserPlus size={16} strokeWidth={2} />
            {busy ? "…" : "Skapa"}
          </button>
        </form>
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {testMsg && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{testMsg}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="section-label">
          {loading ? "Laddar…" : `${guests.length} inbjudna`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: "all", label: "Alla" },
              { key: "yes", label: "Jag kommer" },
              { key: "maybe", label: "Kanske" },
              { key: "no", label: "Kan inte" },
              { key: "none", label: "Ej svarat" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRsvpFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                rsvpFilter === f.key
                  ? "bg-accent text-ink"
                  : "border border-black/10 text-muted hover:bg-black/[0.03]"
              }`}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Notiser kräver att gästen öppnat appen från hemskärmen (iPhone) och tryckt Aktivera.
          Utmaningar syns i appen även utan notis.
        </p>
        {!loading && guests.length === 0 && (
          <p className="text-sm text-muted">Inga gäster ännu — lägg till den första ovan.</p>
        )}
        {!loading && guests.length > 0 && visibleGuests.length === 0 && (
          <p className="text-sm text-muted">Ingen inbjuden med det svaret.</p>
        )}
        <ul className="space-y-2">
          {visibleGuests.map((g) => (
            <li
              key={g.id}
              className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-cream">{g.displayName}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                      g.rsvpStatus === "yes"
                        ? "bg-success/15 text-success"
                        : g.rsvpStatus === "maybe"
                          ? "bg-accent/15 text-accent-strong"
                          : g.rsvpStatus === "no"
                            ? "bg-danger/15 text-danger"
                            : "bg-black/[0.05] text-muted"
                    }`}
                  >
                    {g.rsvpStatus === "yes"
                      ? "Jag kommer"
                      : g.rsvpStatus === "maybe"
                        ? "Kanske"
                        : g.rsvpStatus === "no"
                          ? "Kan inte"
                          : "Ej svarat"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                      g.pushEnabled
                        ? "bg-success/15 text-success"
                        : "bg-black/[0.05] text-muted"
                    }`}
                  >
                    {g.pushEnabled ? "Notiser på" : "Notiser av"}
                  </span>
                </div>
                {g.inviteUrl && (
                  <p className="mt-0.5 truncate text-xs text-muted">{g.inviteUrl}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void testPush(g.id)}
                  disabled={testPushId === g.id}
                  className="btn-secondary !px-3 !py-2 text-xs"
                  title={
                    g.pushEnabled
                      ? "Skicka testnotis"
                      : "Ingen prenumeration sparad — aktivera först från hemskärmsappen"
                  }
                >
                  <Bell size={14} strokeWidth={1.75} />
                  {testPushId === g.id ? "…" : "Testnotis"}
                </button>
                <a
                  href={smsHref(g)}
                  className="btn-secondary !px-3 !py-2 text-xs"
                  aria-disabled={!g.inviteUrl}
                >
                  <MessageSquare size={14} strokeWidth={1.75} />
                  SMS
                </a>
                <button
                  type="button"
                  onClick={() => copyLink(g)}
                  className="btn-secondary !px-3 !py-2 text-xs"
                  disabled={!g.inviteUrl}
                >
                  <Copy size={14} strokeWidth={1.75} />
                  {copiedId === g.id ? "Kopierad" : "Kopiera"}
                </button>
                <button
                  type="button"
                  onClick={() => removeGuest(g.id)}
                  className="rounded-full p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Ta bort ${g.displayName}`}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AdminContent() {
  const [tab, setTab] = useState<"guests" | "pending" | "approved" | "schedule">("guests");

  async function lock() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6 overflow-x-hidden px-4 py-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-cream">Admin</h1>
          <p className="mt-0.5 text-sm text-muted">
            Bjud in gäster, godkänn och skicka utmaningar
          </p>
        </div>
        <button onClick={lock} className="btn-ghost shrink-0">
          <Lock size={14} strokeWidth={1.75} />
          Lås
        </button>
      </div>

      <div className="card flex flex-wrap p-1">
        {(
          [
            { key: "guests", label: "Gäster" },
            { key: "pending", label: "Godkänn" },
            { key: "approved", label: "Utmaningar" },
            { key: "schedule", label: "Schema" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            className={`min-w-[4.5rem] flex-1 rounded-xl py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-accent text-ink" : "text-muted"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "guests" && <GuestsTab />}
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
