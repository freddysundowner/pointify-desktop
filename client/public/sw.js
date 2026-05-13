self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await self.registration.unregister();
      clients.forEach((client) => {
        try { client.postMessage({ type: 'SW_CLEARED' }); } catch (_) {}
        try { client.navigate(client.url); } catch (_) {}
      });
    })()
  );
});
