import { getDb, PATTERNS_STORE } from './indexedDB';
import { Layer, Pattern, SerializedPattern } from '@/types/pattern';

export function serializePattern(pattern: Pattern): SerializedPattern {
  return {
    id: pattern.id,
    name: pattern.name,
    width: pattern.width,
    height: pattern.height,
    fabricCount: pattern.fabricCount,
    fabricColor: pattern.fabricColor,
    layers: pattern.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      stitches: Array.from(layer.stitches.entries()),
    })),
    activeLayerId: pattern.activeLayerId,
    createdAt: pattern.createdAt.toISOString(),
    updatedAt: pattern.updatedAt.toISOString(),
    metadata: pattern.metadata,
  };
}

export function deserializePattern(serialized: SerializedPattern): Pattern {
  let layers: Layer[];
  let activeLayerId: string;

  if (serialized.layers && serialized.layers.length > 0 && serialized.activeLayerId) {
    // Current multi-layer format
    layers = serialized.layers.map((l) => ({
      ...l,
      stitches: new Map(l.stitches),
    }));
    activeLayerId = serialized.activeLayerId;
  } else if (serialized.stitches) {
    // Legacy single-stitches format — wrap in a Background layer
    const layerId = 'background';
    layers = [{ id: layerId, name: 'Background', visible: true, stitches: new Map(serialized.stitches) }];
    activeLayerId = layerId;
  } else {
    const layerId = 'background';
    layers = [{ id: layerId, name: 'Background', visible: true, stitches: new Map() }];
    activeLayerId = layerId;
  }

  return {
    id: serialized.id,
    name: serialized.name,
    width: serialized.width,
    height: serialized.height,
    fabricCount: serialized.fabricCount,
    fabricColor: serialized.fabricColor,
    layers,
    activeLayerId,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
    metadata: serialized.metadata,
  };
}

// ── Local (IndexedDB) copy ───────────────────────────────────────────────────
// Every save lands here first so work survives a refresh even when the backend
// is down. `pendingSync` marks records the server hasn't received yet.

export type LocalRecord = SerializedPattern & { pendingSync?: boolean };

export async function saveLocal(serialized: SerializedPattern, pendingSync: boolean): Promise<void> {
  const db = await getDb();
  const record: LocalRecord = { ...serialized, pendingSync };
  await db.put(PATTERNS_STORE, record);
}

export async function getLocal(id: string): Promise<LocalRecord | undefined> {
  const db = await getDb();
  return db.get(PATTERNS_STORE, id);
}

export async function listLocal(): Promise<LocalRecord[]> {
  const db = await getDb();
  return db.getAll(PATTERNS_STORE);
}

export async function deleteLocal(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(PATTERNS_STORE, id);
}

/**
 * Clear the pending flag, but only if the record hasn't changed since it was
 * uploaded (a newer local edit must stay pending).
 */
export async function markSynced(id: string, uploadedUpdatedAt: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PATTERNS_STORE, 'readwrite');
  const record: LocalRecord | undefined = await tx.store.get(id);
  if (record && record.updatedAt === uploadedUpdatedAt && record.pendingSync) {
    await tx.store.put({ ...record, pendingSync: false });
  }
  await tx.done;
}
