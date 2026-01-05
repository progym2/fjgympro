// Service Worker for Push Notifications
// This allows notifications even when the app is closed

self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Nova Notificação',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'GymPro';
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'default',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        // Try to find an existing window
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle background sync for offline notification queue
self.addEventListener('sync', function(event) {
  console.log('[SW] Sync event:', event.tag);
});

// Periodic background sync check
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'check-link-requests') {
    event.waitUntil(checkForNewLinkRequests());
  }
});

async function checkForNewLinkRequests() {
  // This would check for new link requests in the background
  console.log('[SW] Checking for new link requests...');
}
