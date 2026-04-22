self.addEventListener('push', function(event) {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch(e) {
      data = { title: 'Yeni Bildirim', body: event.data.text() };
    }
    const options = {
      body: data.body || 'Boho Mentosluktan mesajın var',
      icon: '/logo.png',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Boho Mentos', options));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
