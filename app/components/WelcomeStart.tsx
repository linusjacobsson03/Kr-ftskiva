"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, MoreVertical, Share, Smartphone } from "lucide-react";
import { useAuth } from "../providers";
import { useIsStandalone, usePushSubscription } from "./usePushSubscription";

const INSTALL_KEY_PREFIX = "kraftskiva-welcome-v1";
const PUSH_KEY_PREFIX = "kraftskiva-push-welcome-v1";

function installKey(userId: number) {
  return `${INSTALL_KEY_PREFIX}:${userId}`;
}
function pushKey(userId: number) {
  return `${PUSH_KEY_PREFIX}:${userId}`;
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

export default function WelcomeStart() {
  const { user, loading } = useAuth();
  const standalone = useIsStandalone();
  const { status, busy, subscribe, lastError } = usePushSubscription();
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"install" | "push" | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || loading || !user) {
      setMode(null);
      return;
    }

    let installDone = false;
    let pushDone = false;
    try {
      installDone = !!localStorage.getItem(installKey(user.id));
      pushDone = !!localStorage.getItem(pushKey(user.id));
    } catch {
      // Private mode — still show this session.
    }

    setPlatform(detectPlatform());

    if (standalone) {
      if (status === "unknown") return;
      if (status === "subscribed" || pushDone) {
        setMode(null);
        return;
      }
      setMode("push");
      return;
    }

    if (!installDone) {
      setMode("install");
      return;
    }
    setMode(null);
  }, [hydrated, loading, user, standalone, status]);

  function mark(key: string) {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // ignore
    }
  }

  function dismissInstall() {
    if (user) mark(installKey(user.id));
    setMode(null);
  }

  function dismissPush() {
    if (user) mark(pushKey(user.id));
    setMode(null);
  }

  async function enablePush() {
    const ok = await subscribe();
    if (ok) {
      if (user) {
        mark(installKey(user.id));
        mark(pushKey(user.id));
      }
      setMode(null);
    }
  }

  if (!mode || !user) return null;

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

        {mode === "push" ? (
          <>
            <p className="mt-1 text-sm text-muted">
              Appen är på hemskärmen — sätt på notiser så du inte missar när en
              ny utmaning skickas ut.
            </p>
            {status === "denied" && (
              <p className="mt-3 text-sm text-danger">
                Notiser är avstängda. Öppna Inställningar → Notiser → Lilla Brattön
                och slå på Tillåt notiser.
              </p>
            )}
            {lastError && status !== "denied" && (
              <p className="mt-3 text-sm text-danger">{lastError}</p>
            )}
            {status !== "denied" && (
              <button
                type="button"
                onClick={() => void enablePush()}
                disabled={busy}
                className="btn-primary mt-5 w-full"
              >
                <Bell size={15} strokeWidth={1.75} />
                {busy ? "Aktiverar…" : "Sätt på notiser"}
              </button>
            )}
            <button type="button" onClick={dismissPush} className="btn-ghost mt-3 w-full justify-center">
              Inte nu
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
