// Service worker per supporto offline e gestione notifiche push
const CACHE_NAME = 'consegne-app-v1';

// Helper: convert URL-safe base64 VAPID key to Uint8Array (used if we need to resubscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Lista di URL da cacheare solo in produzione
const getUrlsToCache = () => {
  // In sviluppo, non cacheare risorse statiche perché Vite le serve dinamicamente
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return ['/'];
  }
  
  // In produzione, cachea le risorse statiche
  return [
    '/',
    '/static/js/bundle.js',
    '/static/css/main.css',
    '/manifest.json'
  ];
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache opened');
        const urlsToCache = getUrlsToCache();
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Service Worker: Failed to cache some resources', error);
          // Non bloccare l'installazione se alcune risorse non possono essere cacheate
        });
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Ignora le richieste non HTTP/HTTPS (come chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Ignora le richieste del dev server di Vite
  if (event.request.url.includes('/@vite/') || 
      event.request.url.includes('__vite_ping') || 
      event.request.url.includes('node_modules')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      
      // Prova a fare la richiesta di rete con gestione errori
      return fetch(event.request.clone()).catch(error => {
        console.log('Service Worker: Fetch failed for', event.request.url, error);
        
        // Per le richieste di navigazione, restituisci una risposta offline
        if (event.request.mode === 'navigate') {
          return new Response(
            '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Connessione non disponibile</h1><p>L\'applicazione non è disponibile offline.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        
        // Per richieste API, restituisci un errore più specifico
        if (event.request.url.includes('/api/')) {
          return new Response(
            JSON.stringify({ error: 'API non disponibile offline' }),
            { 
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Per altre richieste, rilancia l'errore
        throw error;
      });
    })
  );
});

// Riceve push dal server e mostra la notifica anche se la pagina è in background/chiusa
self.addEventListener('push', event => {
  let data = { title: 'Consegne', body: 'Hai una nuova notifica', icon: '/icon-192x192.png', url: '/' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // fallback: plain text
      try { data.body = event.data.text(); } catch (ee) {}
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: { url: data.url || '/', payload: data },
    tag: data.tag || 'consegne-push'
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Consegne', options));
});

// Gestione notifiche push (se necessario per il futuro)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Mantieni la sessione attiva per le notifiche
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    // Mantieni il service worker attivo
    event.ports[0].postMessage('ALIVE');
  }
});

// Quando la push subscription cambia (es. per scadenza), prova a ri-sottoscrivere e inviare al backend
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    try {
      // Proviamo a recuperare la public key dal server e ri-sottoscrivere
      const resp = await fetch('/api/push/public-key');
      if (!resp.ok) return;
      const { publicKey } = await resp.json();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const newSub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      // Invia la nuova subscription al backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub)
      });
    } catch (err) {
      console.warn('pushsubscriptionchange: non è stato possibile ri-sottoscrivere', err);
    }
  })());
});
