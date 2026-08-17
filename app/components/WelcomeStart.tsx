"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, MoreVertical, Share, Smartphone } from "lucide-react";
import { useAuth } from "../providers";
import { useIsStandalone, usePushSubscription } from "./usePushSubscription";

const INSTALL_KEY_PREFIX = "kraftskiva-welcome-v1";

function installKey(userId: number) {
  return `${INSTALL_KEY_PREFIX}:${userId}`;
}

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[0.7rem] font-semibold text-accent-strong">
        {n}
      </span>
      <span className="min-w-0 text-sm leading-snug text-muted">{children}</span>
    </li>
  );
}

/** First-time browser tip for adding to home screen, then a push prompt in the installed app. */
export default function WelcomeStart() {
  const { user, loading } = useAuth();
  const standalone = useIsStandalone();
  const { status, busy, subscribe, lastError } = usePushSubscription();
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"install" | "push" | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [pushDone, setPushDone] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [skippedPushThisVisit, setSkippedPushThisVisit] = useState(false);
  const activatingRef = useRef(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || loading || !user || standalone === null) {
      setMode(null);
      return;
    }
    if (standalone) {
      if (pushDone || activatingRef.current) {
        setMode("push");
        return;
      }
      // Already on: never ask again. Skipped this visit: wait until next app open.
      if (status === "subscribed" || skippedPushThisVisit) {
        setMode(null);
        return;
      }
      setMode("push");
      return;
    }
    try {
      if (localStorage.getItem(installKey(user.id))) {
        setMode(null);
        return;
      }
    } catch {
      // Private mode — still show once.
    }
    setPlatform(detectPlatform());
    setMode("install");
  }, [hydrated, loading, user, standalone, status, pushDone, skippedPushThisVisit]);

  function skipPushThisVisit() {
    setSkippedPushThisVisit(true);
    setMode(null);
  }

  function dismissInstall() {
    if (user) {
      try {
        localStorage.setItem(installKey(user.id), "1");
      } catch {
        // ignore
      }
    }
    setMode(null);
  }

  async function onEnablePush() {
    activatingRef.current = true;
    const ok = await subscribe();
    if (!ok) {
      activatingRef.current = false;
      return;
    }
    setPushDone(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setTestMsg(res.ok ? "Testnotis skickad." : data.error || "Notiser är på.");
    } catch {
      setTestMsg("Notiser är på.");
    }
    window.setTimeout(() => setMode(null), 2200);
  }

  if (!user || !mode) return null;

  if (mode === "push") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-title"
        onClick={pushDone ? undefined : skipPushThisVisit}
      >
        <div
          className="w-full max-w-md rounded-[1.4rem] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(28,23,18,0.45)]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="section-label">Lilla Brattön</p>
          {pushDone ? (
            <>
              <div className="mt-4 flex justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                  <Bell size={22} strokeWidth={1.75} />
                </span>
              </div>
              <h2
                id="push-title"
                className="font-display mt-3 text-center text-[1.5rem] font-medium tracking-tight text-cream"
              >
                Notiser är på
              </h2>
              <p className="mt-1 text-center text-sm text-muted">{testMsg}</p>
            </>
          ) : (
            <>
              <h2
                id="push-title"
                className="font-display mt-1 text-[1.7rem] font-medium tracking-tight text-cream"
              >
                Hej, {user.firstName}!
              </h2>
              <p className="mt-1 text-sm text-muted">
                Slå på notiser så du inte missar när en ny utmaning ramlar in.
              </p>
              {status === "denied" ? (
                <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
                  Notiser är avstängda. Öppna Inställningar → Lilla Brattön och slå på
                  notiser, öppna sen appen igen.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void onEnablePush()}
                  disabled={busy}
                  className="btn-primary mt-5 w-full"
                >
                  <Bell size={16} strokeWidth={1.75} />
                  {busy ? "Väntar…" : "Slå på notiser"}
                </button>
              )}
              {lastError && <p className="mt-2 text-sm text-danger">{lastError}</p>}
              <button
                type="button"
                onClick={skipPushThisVisit}
                className="btn-ghost mt-3 w-full justify-center"
              >
                Inte nu
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="max-h-[min(92dvh,40rem)] w-full max-w-md overflow-y-auto rounded-[1.4rem] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(28,23,18,0.45)]">
        <p className="section-label">Lilla Brattön</p>
        <h2
          id="welcome-title"
          className="font-display mt-1 text-[1.7rem] font-medium tracking-tight text-cream"
        >
          Hej, {user.firstName}!
        </h2>
        <p className="mt-1 text-sm text-muted">
          Lägg till appen på hemskärmen så kan du sätta på notiser när en ny
          utmaning ramlar in.
        </p>
        <div className="mt-4 space-y-3">
          <div
            className={`rounded-2xl border p-3.5 ${
              platform === "ios"
                ? "border-accent/35 bg-accent/[0.07]"
                : "border-black/10 bg-surface/60"
            }`}
          >
            <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-cream">
              <Share size={15} strokeWidth={1.75} className="text-accent-strong" />
              iPhone
            </p>
            <ol className="space-y-2">
              <Step n={1}>
                Tryck på <span className="font-medium text-cream">Dela</span>{" "}
                (fyrkant med pil upp) längst ner i Safari
              </Step>
              <Step n={2}>
                Scrolla och tryck{" "}
                <span className="font-medium text-cream">Lägg till på hemskärmen</span>
              </Step>
              <Step n={3}>Tryck Lägg till, öppna sen ikonen därifrån</Step>
            </ol>
          </div>

          <div
            className={`rounded-2xl border p-3.5 ${
              platform === "android"
                ? "border-accent/35 bg-accent/[0.07]"
                : "border-black/10 bg-surface/60"
            }`}
          >
            <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-cream">
              <MoreVertical size={15} strokeWidth={1.75} className="text-accent-strong" />
              Android
            </p>
            <ol className="space-y-2">
              <Step n={1}>
                Tryck på <span className="font-medium text-cream">tre prickarna</span> uppe till
                höger i Chrome
              </Step>
              <Step n={2}>
                Tryck{" "}
                <span className="font-medium text-cream">Lägg till på startsidan</span> eller{" "}
                <span className="font-medium text-cream">Installera app</span>
              </Step>
              <Step n={3}>Bekräfta och öppna ikonen från hemskärmen</Step>
            </ol>
          </div>
        </div>
        <button type="button" onClick={dismissInstall} className="btn-primary mt-5 w-full">
          <Smartphone size={15} strokeWidth={1.75} />
          Jag har lagt till den
        </button>
      </div>
    </div>
  );
}
