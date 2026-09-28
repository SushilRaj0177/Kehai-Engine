// Minimal service worker for the installed PWA: exists only so the app can
// show system notifications (Android Chrome requires showNotification via a
// registration) and reopen the right screen when one is tapped. It
// deliberately has no fetch handler -- nothing is cached, so deploys are
// never stuck behind a stale offline copy.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
