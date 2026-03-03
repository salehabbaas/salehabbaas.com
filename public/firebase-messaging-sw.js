/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.3.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.3.0/firebase-messaging-compat.js");

function parsePushEventPayload(data) {
  if (!data) return {};

  try {
    return data.json();
  } catch {
    try {
      const text = data.text();
      if (!text) return {};
      try {
        return JSON.parse(text);
      } catch {
        return { body: text };
      }
    } catch {
      return {};
    }
  }
}

function normalizeNotificationPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const notification = payload.notification && typeof payload.notification === "object" ? payload.notification : {};
  const rawData = payload.data && typeof payload.data === "object" ? payload.data : {};
  const title = notification.title || rawData.title || payload.title || "Reminder";
  const body = notification.body || rawData.body || payload.body || "You have a new reminder.";
  const ctaUrl = rawData.ctaUrl || rawData.link || payload.ctaUrl || payload.link || "/admin/system-inbox";

  return {
    title,
    body,
    ctaUrl,
    data: {
      ...rawData,
      ctaUrl
    }
  };
}

function isLikelyFcmPushPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return (
    typeof payload.from === "string" ||
    typeof payload.fcmMessageId === "string" ||
    typeof payload.collapse_key === "string"
  );
}

async function broadcastForegroundMessage(payload) {
  const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  windowClients.forEach((client) => {
    try {
      client.postMessage({ type: "sa_push_message", payload });
    } catch {
      // Ignore foreground broadcast failures.
    }
  });
}

(function bootstrapMessagingServiceWorker() {
  try {
    const params = new URL(self.location.href).searchParams;
    const config = {
      apiKey: params.get("apiKey") || "",
      authDomain: params.get("authDomain") || "",
      projectId: params.get("projectId") || "",
      storageBucket: params.get("storageBucket") || "",
      messagingSenderId: params.get("messagingSenderId") || "",
      appId: params.get("appId") || ""
    };

    if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
      return;
    }

    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const normalized = normalizeNotificationPayload(payload || {});

      self.registration.showNotification(normalized.title, {
        body: normalized.body,
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        data: {
          ...normalized.data,
          ctaUrl: normalized.ctaUrl
        }
      });

      void broadcastForegroundMessage({
        notification: {
          title: normalized.title,
          body: normalized.body
        },
        data: normalized.data
      });
    });
  } catch {
    // Ignore service worker bootstrap issues.
  }
})();

self.addEventListener("push", (event) => {
  const rawPayload = parsePushEventPayload(event.data);
  if (isLikelyFcmPushPayload(rawPayload)) {
    return;
  }

  const normalized = normalizeNotificationPayload(rawPayload);
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(normalized.title, {
        body: normalized.body,
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        data: {
          ...normalized.data,
          ctaUrl: normalized.ctaUrl
        }
      }),
      broadcastForegroundMessage({
        notification: {
          title: normalized.title,
          body: normalized.body
        },
        data: normalized.data
      })
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  const target = event.notification && event.notification.data && event.notification.data.ctaUrl
    ? event.notification.data.ctaUrl
    : "/admin/system-inbox";

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const absoluteTarget = new URL(target, self.location.origin).toString();

      for (const client of windowClients) {
        if (client.url === absoluteTarget && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(absoluteTarget);
      }

      return Promise.resolve();
    })
  );
});
