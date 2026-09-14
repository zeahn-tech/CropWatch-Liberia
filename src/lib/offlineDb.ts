/**
 * IndexedDB Offline Storage for CropWatch Liberia
 * Enables farmers to capture crop photos and records in remote fields with zero cellular connectivity.
 */

const DB_NAME = 'CropWatchLiberiaDB';
const DB_VERSION = 1;

export interface OfflinePendingScan {
  id: string;
  plantingId: string;
  cropName: string;
  farmName?: string;
  imageBase64: string;
  notes: string;
  farmerReportedSymptoms: string;
  capturedAt: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_scans')) {
        db.createObjectStore('pending_scans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_records')) {
        db.createObjectStore('cached_records', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineScan(scan: Omit<OfflinePendingScan, 'id' | 'synced'>): Promise<string> {
  const db = await openDB();
  const id = `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record: OfflinePendingScan = {
    ...scan,
    id,
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_scans', 'readwrite');
    const store = tx.objectStore('pending_scans');
    const req = store.add(record);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingOfflineScans(): Promise<OfflinePendingScan[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_scans', 'readonly');
    const store = tx.objectStore('pending_scans');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export const getOfflineScans = getPendingOfflineScans;

export async function removeOfflineScan(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_scans', 'readwrite');
    const store = tx.objectStore('pending_scans');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function cacheData(key: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('cached_records', 'readwrite');
    tx.objectStore('cached_records').put({ key, data, cachedAt: Date.now() });
  } catch (e) {
    console.warn('Failed to write to offline cache', e);
  }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cached_records', 'readonly');
      const req = tx.objectStore('cached_records').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cachePlantingsOffline(plantings: any[]): Promise<void> {
  return cacheData('plantings', plantings);
}

export async function getCachedPlantingsOffline(): Promise<any[]> {
  const data = await getCachedData<any[]>('plantings');
  return data || [];
}

export async function cacheObservationsOffline(observations: any[]): Promise<void> {
  return cacheData('observations', observations);
}

export async function getCachedObservationsOffline(): Promise<any[]> {
  const data = await getCachedData<any[]>('observations');
  return data || [];
}
