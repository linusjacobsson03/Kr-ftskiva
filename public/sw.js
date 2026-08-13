// Minimal service worker: installability + Web Push for challenges.
// Content is live party data — no page/API caching.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  // All work must finish inside waitUntil — iOS treats late showNotification
  // as a silent push and can revoke the subscription after a few of those.
  event.waitUntil(
    (async () => {
      let data = {
        title: "Kräftskiva",
        body: "Något nytt har hänt!",
        url: "/challenges",
        tag: "kraftskiva",
      };
      if (event.data) {
        try {
          data = { ...data, ...event.data.json() };
        } catch {
          try {
            data.body = event.data.text();
          } catch {
            // keep defaults
          }
        }
      }

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || "kraftskiva",
        renotify: true,
        data: { url: data.url || "/challenges" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || "/challenges";
  // iOS prefers absolute URLs for openWindow.
  const targetUrl = raw.startsWith("http")
    ? raw
    : new URL(raw, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          try {
            const url = new URL(client.url);
            const target = new URL(targetUrl);
            if (url.origin === target.origin && "focus" in client) {
              return client.focus().then((focused) => {
                if (focused && "navigate" in focused) {
                  return focused.navigate(targetUrl);
                }
                return focused;
              });
            }
          } catch {
            // ignore bad client urls
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
