import webpush from "web-push";
import db, { getOrCreateSetting } from "./db";

function getVapidKeys() {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    getOrCreateSetting("vapid_public_key", () => {
      const keys = webpush.generateVAPIDKeys();
      // Stash the private key alongside it right away so both are created together.
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('vapid_private_key', ?) ON CONFLICT(key) DO NOTHING"
      ).run(keys.privateKey);
      return keys.publicKey;
    });
  const privateKey =
    process.env.VAPID_PRIVATE_KEY ||
    getOrCreateSetting("vapid_private_key", () => {
      const keys = webpush.generateVAPIDKeys();
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('vapid_public_key', ?) ON CONFLICT(key) DO NOTHING"
      ).run(keys.publicKey);
      return keys.privateKey;
    });
  return { publicKey, privateKey };
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const { publicKey, privateKey } = getVapidKeys();
  webpush.setVapidDetails(
    "mailto:party@kraftskiva.local",
    publicKey,
    privateKey
  );
  configured = true;
}

export function getPublicVapidKey(): string {
  ensureConfigured();
  return getVapidKeys().publicKey;
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
  ensureConfigured();
  const subs = db
    .prepare("SELECT * FROM push_subscriptions WHERE user_id = ?")
    .all(userId) as PushSubscriptionRow[];
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  ensureConfigured();
  const subs = db
    .prepare("SELECT * FROM push_subscriptions")
    .all() as PushSubscriptionRow[];
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
      db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
    } else {
      console.error("Push failed for subscription", sub.id, err);
    }
  }
}
