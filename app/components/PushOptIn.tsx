"use client";

import { Bell, Share } from "lucide-react";
import { useState } from "react";
import { useIsStandalone, usePushSubscription } from "./usePushSubscription";

/**
 * Compact notification prompt for the challenges page.
 * Hidden once subscribed. iOS Safari still gets a one-line home-screen tip.
 */
export default function PushOptIn() {
  const { status, busy, subscribe, lastError } = usePushSubscription();
  const standalone = useIsStandalone();
  const [justActivated, setJustActivated] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const isIos =
    typeof navigator !== "undefined" &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  async function onActivate() {
    const ok = await subscribe();
    if (!ok) return;
    setJustActivated(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setTestMsg(
        res.ok
          ? "Testnotis skickad."
          : data.error || "Notiser är på."
      );
    } catch {
      setTestMsg("Notiser är på.");
    }
    window.setTimeout(() => setJustActivated(false), 5000);
  }

  if (standalone === null) return null;

  if (isIos && standalone === false && status !== "subscribed") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2 text-xs text-muted">
        <Share size={14} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
        <p>
          iPhone: Dela → <span className="font-medium text-cream">Lägg till på hemskärmen</span> för
          notiser
        </p>
      </div>
    );
  }

  if (status === "subscribed" && justActivated) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/[0.06] px-3 py-2 text-xs text-muted">
        <Bell size={14} strokeWidth={1.75} className="shrink-0 text-success" />
        <p>
          <span className="font-medium text-cream">Notiser är på.</span> {testMsg}
        </p>
      </div>
    );
  }

  if (status === "subscribed") return null;

  if (status === "denied") {
    return (
      <p className="text-xs text-muted">
        Notiser avstängda — slå på dem i Inställningar → Lilla Brattön.
      </p>
    );
  }

  if (status === "unsupported" && standalone !== true) {
    return isIos ? (
      <p className="text-xs text-muted">Öppna från hemskärmen för att få notiser.</p>
    ) : null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2">
      <Bell size={14} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
      <p className="min-w-0 flex-1 text-xs text-muted">
        <span className="font-medium text-cream">Aktivera notiser</span>
        {lastError ? <span className="text-danger"> — {lastError}</span> : null}
      </p>
      <button
        type="button"
        onClick={() => void onActivate()}
        disabled={busy}
        className="btn-primary shrink-0 px-3 py-1.5 text-xs"
      >
        {busy ? "…" : "Aktivera"}
      </button>
    </div>
  );
}
