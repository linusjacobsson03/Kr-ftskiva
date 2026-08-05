import webpush from "web-push";
import { getAll, getSetting, run, setSetting } from "./db";

let vapidKeysPromise: Promise<{ publicKey: string; privateKey: string }> | null = null;

function loadVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (!vapidKeysPromise) {
    vapidKeysPromise = (async () => {
      const envPublic = process.env.VAPID_PUBLIC_KEY;
      const envPrivate = process.env.VAPID_PRIVATE_KEY;
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
  webpush.setVapidDetails("mailto:party@kraftskiva.local", publicKey, privateKey);
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

/** Sends a push notification to every subscription belonging to a user. Prunes dead subscriptions. */
export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  await ensureConfigured();
  const subs = await getAll<PushSubscriptionRow>(
    "SELECT * FROM push_subscriptions WHERE user_id = ?",
    [userId]
  );
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  await ensureConfigured();
  const subs = await getAll<PushSubscriptionRow>("SELECT * FROM push_subscriptions");
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}

async function sendToSubscription(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  try {
    await webpush.sendNotification(
      JSON.parse(sub.subscription_json),
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription no longer valid (browser unsubscribed / expired).
      await run("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]);
    } else {
      console.error("Push failed for subscription", sub.id, err);
    }
  }
}
