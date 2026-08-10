self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'Vaqen';
  const options = {
    body: data.body || 'Você tem uma nova atualização.',
    icon: data.icon || '/vaqen-icon.svg',
    badge: '/vaqen-icon.svg',
    tag: data.tag || undefined,
    data: { url: data.url || '/today' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/today';
  event.waitUntil((async function() {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
