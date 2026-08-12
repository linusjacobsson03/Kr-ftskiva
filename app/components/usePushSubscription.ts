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
      setStatus(sub ? "subscribed" : "not-subscribed");
    } catch {
      setStatus("not-subscribed");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const subscribe = useCallback(async () => {
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
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
      await refreshStatus();
      return false;
    } finally {
      setBusy(false);
    }
  }, [refreshStatus]);

  return { status, busy, subscribe, refreshStatus };
}
