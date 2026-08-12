"use client";

import { Bell, Share, Smartphone } from "lucide-react";
import { useIsStandalone, usePushSubscription } from "./usePushSubscription";

/**
 * iOS Safari only supports Web Push after "Add to Home Screen".
 * Show that tip even when PushManager is missing (normal Safari).
 * Once installed (standalone), show the activate button.
 */
export default function PushOptIn() {
  const { status, busy, subscribe } = usePushSubscription();
  const standalone = useIsStandalone();
  const isIos =
    typeof navigator !== "undefined" &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  if (status === "subscribed") return null;

  // Safari (not installed): PushManager is missing → still show A2HS tip.
  if (isIos && !standalone) {
    return (
      <div className="card flex gap-3 p-4">
        <Share size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent-strong" />
        <div className="space-y-1.5 text-sm text-muted">
          <p className="font-medium text-cream">Få notis vid ny utmaning</p>
          <p>
            På iPhone måste appen ligga på hemskärmen. Tryck{" "}
            <span className="text-cream">Dela</span> i Safari →{" "}
            <span className="text-cream">&quot;Lägg till på hemskärmen&quot;</span>
            . Öppna sen Kräftskiva därifrån och aktivera notiser.
          </p>
        </div>
      </div>
    );
  }

  if (status === "unknown") {
    return (
      <div className="card flex items-center gap-3 p-4">
        <Bell size={18} strokeWidth={1.5} className="shrink-0 animate-pulse text-accent/50" />
        <p className="text-sm text-muted">Kollar notiser…</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="card flex gap-3 p-4">
        <Smartphone size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-sm text-muted">
          <span className="font-medium text-cream">Notiser är avstängda.</span>{" "}
          {isIos
            ? "Öppna Inställningar → Notiser → Kräftskiva och slå på Tillåt notiser."
            : "Tillåt notiser för den här sidan i webbläsarens inställningar."}
        </p>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="card flex gap-3 p-4">
        <Bell size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
        <p className="text-sm text-muted">
          Din enhet stödjer inte pushnotiser i den här webbläsaren.
        </p>
      </div>
    );
  }

  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="flex gap-3">
        <Bell size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent-strong" />
        <div>
          <p className="text-sm font-medium text-cream">Slå på notiser</p>
          <p className="mt-0.5 text-sm text-muted">
            Få en notis direkt när du får en ny utmaning
          </p>
        </div>
      </div>
      <button onClick={() => void subscribe()} disabled={busy} className="btn-primary shrink-0 text-sm">
        {busy ? "…" : "Aktivera"}
      </button>
    </div>
  );
}
