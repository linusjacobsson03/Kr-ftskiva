"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";

/**
 * Gates /admin behind a phone-style PIN. The code is ADMIN_PASSCODE
 * (change it in env to change the PIN).
 */
export default function AdminPasscodeGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [passcodeConfigured, setPasscodeConfigured] = useState<boolean | null>(null);
  const [length, setLength] = useState(4);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setUnlocked(!!data.unlocked);
        setPasscodeConfigured(!!data.passcodeConfigured);
        const n = Number(data.passcodeLength);
        if (n >= 4 && n <= 8) setLength(n);
      })
      .catch(() => setUnlocked(false));
  }, []);

  const tryUnlock = useCallback(async (code: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: code }),
      });
      let data: { error?: string; ok?: boolean };
      try {
        data = await res.json();
      } catch {
        setError("Oväntat svar från servern, testa igen.");
        setDigits("");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Fel kod.");
        setDigits("");
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
        try {
          navigator.vibrate?.(40);
        } catch {
          // ignore
        }
        return;
      }
      setUnlocked(true);
    } catch {
      setError("Kunde inte nå servern, testa igen.");
      setDigits("");
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }, []);

  const pushDigit = useCallback(
    (d: string) => {
      if (busy || unlocked) return;
      setDigits((prev) => {
        if (prev.length >= length) return prev;
        const next = prev + d;
        if (next.length === length) {
          void tryUnlock(next);
        }
        return next;
      });
      setError(null);
    },
    [busy, length, tryUnlock, unlocked]
  );

  const popDigit = useCallback(() => {
    if (busy) return;
    setDigits((prev) => prev.slice(0, -1));
    setError(null);
  }, [busy]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (unlocked) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        pushDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        popDigit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popDigit, pushDigit, unlocked]);

  if (unlocked === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      </div>
    );
  }

  if (!unlocked) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-xs text-center">
          <p className="font-display text-xl font-medium text-cream">Admin</p>
          <p className="mt-1 text-sm text-muted">Ange koden för att komma in</p>

          <div
            className={`mt-8 flex items-center justify-center gap-3 ${shake ? "animate-pin-shake" : ""}`}
          >
            {Array.from({ length }, (_, i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                  i < digits.length
                    ? "border-accent bg-accent"
                    : "border-black/25 bg-transparent"
                }`}
              />
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          {busy && !error && <p className="mt-4 text-sm text-muted">Kollar…</p>}

          <div className="mx-auto mt-8 grid w-[17.5rem] grid-cols-3 gap-3">
            {keys.map((key, i) => {
              if (key === "") return <span key={`empty-${i}`} />;
              if (key === "del") {
                return (
                  <button
                    key="del"
                    type="button"
                    onClick={popDigit}
                    disabled={busy || digits.length === 0}
                    aria-label="Radera"
                    className="flex h-[4.4rem] items-center justify-center rounded-full text-cream transition active:bg-black/[0.06] disabled:opacity-30"
                  >
                    <Delete size={26} strokeWidth={1.5} />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pushDigit(key)}
                  disabled={busy}
                  className="flex h-[4.4rem] items-center justify-center rounded-full text-[1.65rem] font-medium tabular text-cream transition active:bg-black/[0.08] disabled:opacity-40"
                >
                  {key}
                </button>
              );
            })}
          </div>

          {passcodeConfigured === false && (
            <p className="mt-8 rounded-lg bg-accent/10 p-3 text-left text-xs text-muted">
              <span className="font-medium text-accent-strong">Felsökningstips:</span> servern
              hittar just nu ingen <code className="text-cream">ADMIN_PASSCODE</code>. Sätt en
              pinkod med 4–8 siffror där, deploya om, så byts koden.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
