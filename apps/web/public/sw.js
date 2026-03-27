self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    typeof event.notification.data?.url === "string" ? event.notification.data.url : "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        title: "Noctification",
        body: event.data.text()
      };
    }
  }

  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : "Noctification";
  const body =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body
      : "Nova notificacao operacional";
  const tag = typeof payload.tag === "string" && payload.tag.trim() ? payload.tag : undefined;
  const url = typeof payload.url === "string" && payload.url.trim() ? payload.url : "/notifications";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: {
        url
      }
    })
  );
});
