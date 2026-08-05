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
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true
    );
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
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? "subscribed" : "not-subscribed");
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const subscribe = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await fetch("/api/push/vapid-public-key").then((r) =>
        r.json()
      );
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setStatus("subscribed");
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, subscribe, refreshStatus };
}
