"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushStatus =
  | "unsupported"
  | "unknown"
  | "denied"
  | "subscribed"
  | "not-subscribed";

/** Detects standalone / installed-to-home-screen mode across Android + iOS Safari. */
export function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const mq = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      setStandalone(mq.matches || nav.standalone === true);
    };
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return standalone;
}

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("unknown");
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setStatus("not-subscribed");
        return;
      }
      // Re-sync to server — local PushManager sub alone is not enough
      // (e.g. permission granted before login, or previous save failed).
      try {
        const saveRes = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        if (saveRes.status === 401) {
          // Logged out: keep local sub, but treat as not ready for our sends.
          setStatus("not-subscribed");
          return;
        }
      } catch {
        // Network blip — still show subscribed if browser has it.
      }
      setStatus("subscribed");
    } catch {
      setStatus("not-subscribed");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setLastError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        setLastError("Öppna från hemskärmsappen (iPhone) — Safari-fliken stödjer inte notiser.");
        return false;
      }

      // Ensure SW is registered before requesting permission (iOS is picky).
      const existing = await navigator.serviceWorker.getRegistration();
      if (!existing) {
        await navigator.serviceWorker.register("/sw.js");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setLastError("Du måste tillåta notiser i dialogen.");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        throw new Error("Saknar VAPID-nyckel");
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte spara prenumeration");
      }

      setStatus("subscribed");
      return true;
    } catch (err) {
      console.error("Push subscribe failed", err);
      setLastError(err instanceof Error ? err.message : "Kunde inte aktivera notiser");
      await refreshStatus();
      return false;
    } finally {
      setBusy(false);
    }
  }, [refreshStatus]);

  return { status, busy, subscribe, refreshStatus, lastError };
}
