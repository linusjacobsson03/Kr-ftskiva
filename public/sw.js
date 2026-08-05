// Minimal service worker: just enough for installability + Web Push.
// Content is live party data, so we deliberately don't cache pages/API
// responses — everyone should always see the freshest challenges/photos.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Straight passthrough to the network (required for installability on
  // some browsers, but no caching behavior).
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let data = { title: "Kräftskiva", body: "Något nytt har hänt!" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "kraftskiva",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const url = new URL(client.url);
          if (url.pathname === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
