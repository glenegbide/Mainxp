// MAINXP service worker — push delivery only. No offline caching yet: a stale
// cache on a life OS is worse than a network wait.

// An updated worker must take over immediately — otherwise a fixed push
// handler waits for every tab to close before it ever runs.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  // iOS revokes the subscription if a push doesn't show a notification, so
  // there is always a fallback.
  let data = { title: "MAINXP", body: "Ouvre ta journée.", url: "/today", tag: "mainxp" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* malformed payload — keep the fallback */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url, id: data.id },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/today";
  const id = event.notification.data && event.notification.data.id;
  event.waitUntil(
    (async () => {
      if (id) {
        try {
          await fetch("/api/notifications/opened", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
          });
        } catch {
          /* opening the app matters more than the metric */
        }
      }
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
