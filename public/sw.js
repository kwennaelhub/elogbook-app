// InternLog Service Worker — Mode hors-ligne
const CACHE_NAME = 'internlog-v1'
const OFFLINE_URL = '/offline'

// Ressources à pré-cacher (app shell)
const PRECACHE_URLS = [
  '/',
  '/logbook',
  '/dashboard',
  '/calendar',
  '/templates',
  '/notes',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Installation : pré-cacher l'app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignorer les erreurs de pré-cache individuelles
        return Promise.allSettled(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
        )
      })
    })
  )
  self.skipWaiting()
})

// Activation : nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch : stratégie Network-First avec fallback cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return

  // Ignorer les requêtes API Supabase et auth
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  // Ignorer les requêtes Chrome extension
  if (url.protocol === 'chrome-extension:') return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Mettre en cache les réponses valides
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(async () => {
        // Réseau indisponible : chercher dans le cache
        const cachedResponse = await caches.match(request)
        if (cachedResponse) return cachedResponse

        // Si c'est une navigation, afficher la page offline
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL)
          if (offlinePage) return offlinePage
        }

        // Fallback générique
        return new Response('Hors ligne', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        })
      })
  )
})
