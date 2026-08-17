"use client";

import { Bell, Share, Smartphone } from "lucide-react";
import { useState } from "react";
import { useIsStandalone, usePushSubscription } from "./usePushSubscription";

/**
 * iOS Safari only supports Web Push after "Add to Home Screen".
 * Show that tip even when PushManager is missing (normal Safari).
 * Once installed (standalone), show the activate button.
 */
export default function PushOptIn() {
  const { status, busy, subscribe, lastError, refreshStatus } = usePushSubscription();
  const standalone = useIsStandalone();
  const [testBusy, setTestBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [justActivated, setJustActivated] = useState(false);

  const isIos =
    typeof navigator !== "undefined" &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  async function sendTest() {
    setTestBusy(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestMsg(data.error || "Testnotisen gick inte att skicka.");
        return;
      }
      setTestMsg("Test skickad — kolla låsskärmen (appen kan vara i bakgrunden).");
    } catch {
      setTestMsg("Kunde inte nå servern.");
    } finally {
      setTestBusy(false);
    }
  }

  async function onActivate() {
    const ok = await subscribe();
    if (ok) {
      setJustActivated(true);
      await sendTest();
    }
  }

  // Safari (not installed): PushManager is missing → still show A2HS tip.
  if (isIos && !standalone && status !== "subscribed") {
    return (
      <div className="card flex gap-3 border-accent/25 bg-accent/[0.06] p-4">
        <Share size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent-strong" />
        <div className="space-y-1.5 text-sm text-muted">
          <p className="font-medium text-cream">Notiser funkar inte i Safari-fliken</p>
          <p>
            På iPhone måste du öppna Lilla Brattön från hemskärmen. Tryck{" "}
            <span className="text-cream">Dela</span> →{" "}
            <span className="text-cream">&quot;Lägg till på hemskärmen&quot;</span>
            , öppna ikonen därifrån, logga in via din inbjudningslänk, och tryck Aktivera.
          </p>
        </div>
      </div>
    );
  }

  if (status === "subscribed" && !justActivated) {
    return (
      <div className="card flex items-center justify-between gap-3 p-4">
        <div className="flex gap-3">
          <Bell size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium text-cream">Notiser är på</p>
            <p className="mt-0.5 text-sm text-muted">
              Får du ingen notis? Stäng appen till bakgrunden och testa.
            </p>
            {testMsg && (
              <p className={`mt-1 text-xs ${testMsg.startsWith("Test") ? "text-success" : "text-danger"}`}>
                {testMsg}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void sendTest()}
          disabled={testBusy}
          className="btn-secondary shrink-0 text-sm"
        >
          {testBusy ? "…" : "Testa"}
        </button>
      </div>
    );
  }

  if (status === "subscribed" && justActivated) {
    return (
      <div className="card flex gap-3 border-success/25 bg-success/[0.06] p-4">
        <Bell size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-success" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-cream">Notiser aktiverade</p>
          <p className="text-muted">
            {testMsg || "En testnotis skickades — stäng appen och kolla låsskärmen."}
          </p>
          <button
            type="button"
            className="text-xs text-accent-strong underline"
            onClick={() => {
              setJustActivated(false);
              void refreshStatus();
            }}
          >
            Stäng
          </button>
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
            ? "Öppna Inställningar → Notiser → Lilla Brattön och slå på Tillåt notiser."
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
          {isIos
            ? "Öppna appen från hemskärmen (inte Safari-fliken) för att kunna få notiser."
            : "Din enhet stödjer inte pushnotiser i den här webbläsaren."}
        </p>
      </div>
    );
  }

  return (
    <div className="card flex items-center justify-between gap-3 border-accent/25 bg-accent/[0.06] p-4">
      <div className="flex gap-3">
        <Bell size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent-strong" />
        <div>
          <p className="text-sm font-medium text-cream">Aktivera notiser</p>
          <p className="mt-0.5 text-sm text-muted">
            Utan det här syns utmaningar bara i appen — ingen push till telefonen.
          </p>
          {lastError && <p className="mt-1 text-xs text-danger">{lastError}</p>}
        </div>
      </div>
      <button onClick={() => void onActivate()} disabled={busy} className="btn-primary shrink-0 text-sm">
        {busy ? "…" : "Aktivera"}
      </button>
    </div>
  );
}
