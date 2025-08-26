// Service worker per supporto offline e gestione notifiche push
const CACHE_NAME = 'consegne-app-v1';

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

// Gestione notifiche push (se necessario per il futuro)
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Apri la finestra dell'app quando si clicca sulla notifica
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Mantieni la sessione attiva per le notifiche
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    // Mantieni il service worker attivo
    event.ports[0].postMessage('ALIVE');
  }
});
