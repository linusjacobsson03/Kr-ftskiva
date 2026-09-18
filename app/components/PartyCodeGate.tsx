"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Delete, PartyPopper } from "lucide-react";

/** Guests get this code handed out at the party to unlock the app. */
const PARTY_CODE = "7593";

const CONFETTI_COLORS = ["#7ab8f0", "#f3efe6", "#e0b64f", "#7c2d3a", "#6fbf9a"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.4 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
        round: Math.random() > 0.5,
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.55,
            backgroundColor: p.color,
            borderRadius: p.round ? "999px" : "2px",
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Shown on personal invite links while "party mode" is on: guests need a
 * code (handed out at the party) to unlock the app. Solving it celebrates
 * with confetti, then hands back to the normal invite via onSolved.
 */
export default function PartyCodeGate({ onSolved }: { onSolved: () => void }) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [solved, setSolved] = useState(false);

  const pushDigit = useCallback(
    (d: string) => {
      if (solved) return;
      setDigits((prev) => {
        if (prev.length >= PARTY_CODE.length) return prev;
        const next = prev + d;
        if (next.length === PARTY_CODE.length) {
          if (next === PARTY_CODE) {
            setSolved(true);
          } else {
            setError("Fel kod, testa igen.");
            setShake(true);
            window.setTimeout(() => setShake(false), 450);
            try {
              navigator.vibrate?.(40);
            } catch {
              // ignore
            }
            return "";
          }
        }
        return next;
      });
      setError(null);
    },
    [solved]
  );

  const popDigit = useCallback(() => {
    if (solved) return;
    setDigits((prev) => prev.slice(0, -1));
    setError(null);
  }, [solved]);

  useEffect(() => {
    if (solved) return;
    function onKey(e: KeyboardEvent) {
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
  }, [solved, popDigit, pushDigit]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#0b0d0c] px-6 py-10 text-[#f3efe6]">
      <div className="w-full max-w-xs text-center">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#7ab8f0]">
          Kvällen är igång 🦞
        </p>
        <p className="font-display mt-2 text-2xl font-semibold text-[#f3efe6]">Ange koden</p>
        <p className="mt-1.5 text-sm text-[#9a968c]">
          Ni fick den på festen – skriv in den för att komma in i appen.
        </p>

        <div
          className={`mt-8 flex items-center justify-center gap-3 ${shake ? "animate-pin-shake" : ""}`}
        >
          {Array.from({ length: PARTY_CODE.length }, (_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                i < digits.length
                  ? "border-[#7ab8f0] bg-[#7ab8f0]"
                  : "border-white/25 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-[#e2666a]">{error}</p>}

        <div className="mx-auto mt-8 grid w-[17.5rem] grid-cols-3 gap-3">
          {keys.map((key, i) => {
            if (key === "") return <span key={`empty-${i}`} />;
            if (key === "del") {
              return (
                <button
                  key="del"
                  type="button"
                  onClick={popDigit}
                  disabled={digits.length === 0}
                  aria-label="Radera"
                  className="flex h-[4.4rem] items-center justify-center rounded-full text-[#f3efe6] transition active:bg-white/[0.06] disabled:opacity-30"
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
                className="flex h-[4.4rem] items-center justify-center rounded-full text-[1.65rem] font-medium tabular text-[#f3efe6] transition active:bg-white/[0.08]"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {solved ? (
        <>
          <Confetti />
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="code-solved-heading"
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#14100d] p-6 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
              <PartyPopper size={32} strokeWidth={1.75} className="mx-auto text-[#7ab8f0]" />
              <h2
                id="code-solved-heading"
                className="font-display mt-3 text-xl font-semibold text-[#f3efe6]"
              >
                Bra jobbat, du löste koden! 🎉
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#9a968c]">
                Nu är ni inne – trevlig kväll!
              </p>
              <button
                type="button"
                onClick={onSolved}
                className="mt-5 w-full rounded-full bg-[#f3efe6] py-2.5 text-[0.85rem] font-bold text-[#0b0d0c] transition active:scale-[0.98]"
              >
                Fortsätt
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
