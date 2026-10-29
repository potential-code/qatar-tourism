/**
 * Tiny IndexedDB store for the demo. Two object stores:
 *   snapshots  the whole DemoDb under one versioned key (too big for localStorage's ~5 MB)
 *   uploads    file Blobs by key (assignment uploads)
 *
 * Every call fails soft: without IndexedDB (private mode, blocked storage, tests) the snapshot
 * is simply not saved and uploads live in memory for the page's lifetime.
 */

const DB_NAME = 'qta-demo'
const DB_VERSION = 1
const SNAPSHOTS = 'snapshots'
const UPLOADS = 'uploads'

let opening: Promise<IDBDatabase | null> | null = null
const memoryUploads = new Map<string, Blob>()

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening
  opening = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        for (const store of [SNAPSHOTS, UPLOADS]) {
          if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return opening
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (objects: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  try {
    const idb = await open()
    if (!idb) return null
    return await request(run(idb.transaction(store, mode).objectStore(store)))
  } catch {
    return null
  }
}

// --- Snapshots --------------------------------------------------------------------------------

export async function readSnapshot<T>(key: string): Promise<T | null> {
  return ((await withStore(SNAPSHOTS, 'readonly', (s) => s.get(key))) as T | undefined) ?? null
}

/** Saves a structured clone of `value`. Returns false when it could not be stored. */
export async function writeSnapshot(key: string, value: unknown): Promise<boolean> {
  return (await withStore(SNAPSHOTS, 'readwrite', (s) => s.put(value, key))) !== null
}

/** Removes every snapshot except `keep` (older versions of the dataset). */
export async function pruneSnapshots(keep: string): Promise<void> {
  const keys = (await withStore(SNAPSHOTS, 'readonly', (s) => s.getAllKeys())) ?? []
  for (const key of keys) {
    if (key !== keep) await withStore(SNAPSHOTS, 'readwrite', (s) => s.delete(key))
  }
}

// --- Uploads ----------------------------------------------------------------------------------

export async function putUpload(key: string, blob: Blob): Promise<void> {
  memoryUploads.set(key, blob)
  await withStore(UPLOADS, 'readwrite', (s) => s.put(blob, key))
}

export async function getUpload(key: string): Promise<Blob | null> {
  const stored = await withStore(UPLOADS, 'readonly', (s) => s.get(key))
  return stored instanceof Blob ? stored : (memoryUploads.get(key) ?? null)
}

export async function clearUploads(): Promise<void> {
  memoryUploads.clear()
  await withStore(UPLOADS, 'readwrite', (s) => s.clear())
}
