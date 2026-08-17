import webpush from "web-push";
import { getAll, getSetting, run, setSetting } from "./db";

let vapidKeysPromise: Promise<{ publicKey: string; privateKey: string }> | null = null;

function loadVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (!vapidKeysPromise) {
    vapidKeysPromise = (async () => {
      const envPublic = process.env.VAPID_PUBLIC_KEY?.trim();
      const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
      if (envPublic && envPrivate) {
        return { publicKey: envPublic, privateKey: envPrivate };
      }

      const [storedPublic, storedPrivate] = await Promise.all([
        getSetting("vapid_public_key"),
        getSetting("vapid_private_key"),
      ]);
      if (storedPublic && storedPrivate) {
        return { publicKey: storedPublic, privateKey: storedPrivate };
      }

      const keys = webpush.generateVAPIDKeys();
      await Promise.all([
        setSetting("vapid_public_key", keys.publicKey),
        setSetting("vapid_private_key", keys.privateKey),
      ]);
      return keys;
    })();
  }
  return vapidKeysPromise;
}

let configured = false;
async function ensureConfigured() {
  if (configured) return;
  const { publicKey, privateKey } = await loadVapidKeys();
  // Contact URI required by VAPID — use a stable mailto (Apple accepts this).
  webpush.setVapidDetails("mailto:kraftskiva@example.com", publicKey, privateKey);
  configured = true;
}

export async function getPublicVapidKey(): Promise<string> {
  const { publicKey } = await loadVapidKeys();
  await ensureConfigured();
  return publicKey;
}

export interface PushSubscriptionRow {
  id: number;
  user_id: number;
  endpoint: string;
  subscription_json: string;
}

export type PushSendResult = {
  attempted: number;
  delivered: number;
  failed: number;
  /** Human-readable reason when nothing was delivered. */
  error?: string;
};

function pushErrorMessage(err: unknown): string {
  const e = err as {
    statusCode?: number;
    body?: string;
    message?: string;
  };
  const body = typeof e.body === "string" ? e.body.slice(0, 200) : "";
  if (e.statusCode === 403 || e.statusCode === 401) {
    return `Push-nyckel mismatch (HTTP ${e.statusCode}). Sätt stabila VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY i hostingen och be gästen aktivera notiser igen.`;
  }
  if (e.statusCode === 404 || e.statusCode === 410) {
    return "Prenumerationen har gått ut — aktivera notiser igen från hemskärmsappen.";
  }
  if (e.statusCode) {
    return `Push-tjänsten svarade HTTP ${e.statusCode}${body ? `: ${body}` : ""}`;
  }
  return e.message || "Okänt push-fel";
}

/** Sends a push notification to every subscription belonging to a user. Prunes dead subscriptions. */
export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<PushSendResult> {
  await ensureConfigured();
  const subs = await getAll<PushSubscriptionRow>(
    "SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY id DESC",
    [userId]
  );
  if (subs.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
      failed: 0,
      error:
        "Ingen notisprenumeration sparad för den här personen. Öppna hemskärmsappen inloggad och tryck Aktivera.",
    };
  }
  const [latest, ...stale] = subs;
  if (stale.length > 0) {
    await Promise.all(stale.map((s) => run("DELETE FROM push_subscriptions WHERE id = ?", [s.id])));
  }
  const result = await sendToSubscription(latest, payload);
  return {
    attempted: 1,
    delivered: result.ok ? 1 : 0,
    failed: result.ok ? 0 : 1,
    error: result.ok ? undefined : result.error,
  };
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<PushSendResult> {
  await ensureConfigured();
  const subs = await getAll<PushSubscriptionRow>("SELECT * FROM push_subscriptions");
  if (subs.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
      failed: 0,
      error: "Ingen har aktiverat notiser ännu.",
    };
  }
  const results = await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
  const delivered = results.filter((r) => r.ok).length;
  const firstError = results.find((r) => !r.ok)?.error;
  return {
    attempted: subs.length,
    delivered,
    failed: subs.length - delivered,
    error: delivered === 0 ? firstError : undefined,
  };
}

async function sendToSubscription(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      JSON.parse(sub.subscription_json),
      JSON.stringify(payload),
      {
        TTL: 60 * 60,
        urgency: "high",
        topic: payload.tag?.slice(0, 32) || "kraftskiva",
      }
    );
    return { ok: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await run("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]);
    } else {
      console.error("Push failed for subscription", sub.id, err);
    }
    return { ok: false, error: pushErrorMessage(err) };
  }
}
