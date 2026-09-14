// CropWatch Liberia Service Worker with Advanced Background Sync and Shell Caching
const CACHE_NAME = 'cropwatch-static-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CropWatchLiberiaDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Retrieve pending offline scans from IndexedDB
function getPendingScans(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_scans', 'readonly');
    const store = tx.objectStore('pending_scans');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Retrieve saved authentication token from IndexedDB
function getAuthToken(db) {
  return new Promise((resolve) => {
    const tx = db.transaction('cached_records', 'readonly');
    const store = tx.objectStore('cached_records');
    const req = store.get('token');
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => resolve(null);
  });
}

// Delete successfully synced scan from IndexedDB
function deletePendingScan(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_scans', 'readwrite');
    const store = tx.objectStore('pending_scans');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Network fetch helper with exponential backoff retry
async function fetchWithRetry(url, options, maxRetries = 3, initialDelay = 1000) {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      throw new Error(`Server returned status ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Sync fetch attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Broadcast synchronization completion to all active clients
async function broadcastSyncComplete() {
  const clientsList = await self.clients.matchAll();
  for (const client of clientsList) {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  }
}

// Background sync execution
async function syncObservations() {
  try {
    const db = await openDB();
    const token = await getAuthToken(db);
    if (!token) {
      console.warn('Background sync aborted: No authentication token found in IndexedDB.');
      return;
    }

    const scans = await getPendingScans(db);
    if (scans.length === 0) {
      return;
    }

    let syncedAny = false;
    for (const scan of scans) {
      try {
        const response = await fetchWithRetry('/api/observations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plantingId: scan.plantingId,
            imageBase64OrUrl: scan.imageBase64,
            notes: scan.notes,
            farmerReportedSymptoms: scan.farmerReportedSymptoms,
          })
        });

        const data = await response.json();
        if (data.success) {
          await deletePendingScan(db, scan.id);
          console.log(`Successfully auto-synced pending scan in background: ${scan.id}`);
          syncedAny = true;
        }
      } catch (scanError) {
        console.error(`Failed to sync scan ${scan.id} in background sync step:`, scanError);
      }
    }

    if (syncedAny) {
      await broadcastSyncComplete();
    }
  } catch (err) {
    console.error('Error during background sync execution:', err);
  }
}

// Service Worker Lifetime Events
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache interceptor & App Shell delivery
self.addEventListener('fetch', (event) => {
  // Only handle GET requests; skip internal backend api endpoints
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Background Sync Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-observations') {
    event.waitUntil(syncObservations());
  }
});
