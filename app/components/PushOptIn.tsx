"use client";

import { Bell, Share } from "lucide-react";
import { useIsStandalone, usePushSubscription } from "./usePushSubscription";

export default function PushOptIn() {
  const { status, busy, subscribe } = usePushSubscription();
  const standalone = useIsStandalone();
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (status === "subscribed" || status === "unknown") return null;

  if (status === "unsupported" || status === "denied") {
    return null;
  }

  if (isIos && !standalone) {
    return (
      <div className="card flex gap-3 p-4">
        <Share size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent-strong" />
        <p className="text-sm text-muted">
          <span className="font-medium text-cream">Missa inga utmaningar —</span> lägg till
          Kräftskiva på hemskärmen för notiser: tryck på Dela i Safari och välj{" "}
          <span className="text-cream">&quot;Lägg till på hemskärmen&quot;</span>.
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
          <p className="mt-0.5 text-sm text-muted">Missa aldrig en ny utmaning</p>
        </div>
      </div>
      <button onClick={subscribe} disabled={busy} className="btn-secondary shrink-0 text-sm">
        {busy ? "…" : "Aktivera"}
      </button>
    </div>
  );
}
