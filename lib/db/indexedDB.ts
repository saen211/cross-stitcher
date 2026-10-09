import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'cross-stitch-designer';
const DB_VERSION = 1;
export const PATTERNS_STORE = 'patterns';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PATTERNS_STORE)) {
          db.createObjectStore(PATTERNS_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
