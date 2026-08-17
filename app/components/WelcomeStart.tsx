"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MoreVertical, Share, Smartphone } from "lucide-react";
import { useAuth } from "../providers";
import { useIsStandalone } from "./usePushSubscription";

const STORAGE_PREFIX = "kraftskiva-welcome-v1";

function storageKey(userId: number) {
  return `${STORAGE_PREFIX}:${userId}`;
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
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (loading || !user) {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(storageKey(user.id))) {
        setOpen(false);
        return;
      }
    } catch {
      // Private mode etc. — still show once this session.
    }
    setPlatform(detectPlatform());
    setOpen(true);
  }, [loading, user]);

  function dismiss() {
    if (user) {
      try {
        localStorage.setItem(storageKey(user.id), "1");
      } catch {
        // ignore
      }
    }
    setOpen(false);
  }

  if (!open || !user) return null;

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
          {standalone
            ? "Kul att du är här. Appen är redan på hemskärmen — då funkar notiser om nya utmaningar."
            : "Lägg till appen på hemskärmen så får du notiser när en ny utmaning ramlar in."}
        </p>

        {!standalone && (
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
        )}

        <button type="button" onClick={dismiss} className="btn-primary mt-5 w-full">
          <Smartphone size={15} strokeWidth={1.75} />
          {standalone ? "Kom igång" : "Jag har lagt till den"}
        </button>
      </div>
    </div>
  );
}
