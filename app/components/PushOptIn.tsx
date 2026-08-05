"use client";

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
      <div className="card p-4 text-sm">
        <p className="font-semibold">📲 Missa inga utmaningar!</p>
        <p className="mt-1 text-white/70">
          Lägg till Kräftskiva på hemskärmen för att kunna få notiser: tryck på{" "}
          <span className="font-semibold">Dela</span> ⬆️ i Safari och välj{" "}
          <span className="font-semibold">&quot;Lägg till på hemskärmen&quot;</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-semibold">🔔 Slå på notiser</p>
        <p className="mt-0.5 text-sm text-white/70">
          Så du inte missar när en ny utmaning dyker upp!
        </p>
      </div>
      <button onClick={subscribe} disabled={busy} className="btn-secondary shrink-0 text-sm">
        {busy ? "…" : "Aktivera"}
      </button>
    </div>
  );
}
