const CACHE_NAME = 'oxy-hr-cache-v3';
const OFFLINE_URL = '/offline';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/favicon.ico',
  '/logo.png',
  '/oxy-logo.jpeg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/maskable-icon.png'
];

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;
const isStaticAsset = (url) => url.pathname.startsWith('/_next/') || /\.(js|css|png|jpe?g|svg|gif|webp|avif|ico|json|woff2|woff|ttf|eot|wasm)$/i.test(url.pathname);

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache stable compiled Next.js build chunks (styles, scripts)
  const isNextStatic = url.pathname.startsWith('/_next/static/') && !url.pathname.includes('.hot-update.');

  // Exclude auth routes, dynamic next routes (HMR, next-dev), socket, and extensions
  if (!isNextStatic && (
    url.pathname.startsWith('/api/auth') || 
    url.pathname.startsWith('/_next') ||
    url.pathname.includes('/socket.io') ||
    event.request.url.startsWith('chrome-extension:')
  )) {
    return;
  }

  // Handle navigation requests (html pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Handle static resources and same-origin assets
  if (!isSameOrigin(event.request)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Refresh the cached resource in the background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => { /* offline or network error */ });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          if (event.request.destination === 'image') {
            return caches.match('/favicon.ico');
          }
          return caches.match(OFFLINE_URL);
        });
    })
  );
});

// Background push notification listener
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'New Notification', body: event.data.text() };
    }
  }

  const title = payload.title || 'OXY-HR PRO Community';
  const options = {
    body: payload.body || payload.message || 'You received a new message.',
    icon: '/logo.png',
    badge: '/favicon.ico',
    data: {
      link: (payload.data && payload.data.link) || '/dashboard/community'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click to open community chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data ? event.notification.data.link : '/dashboard/community';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window is already open at the dashboard, focus it and redirect
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: link });
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
    })
  );
});
