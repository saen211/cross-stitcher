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

export async function savePattern(pattern: Pattern): Promise<void> {
  const db = await getDb();
  await db.put(PATTERNS_STORE, serializePattern(pattern));
}

export async function getPattern(id: string): Promise<Pattern | null> {
  const db = await getDb();
  const row: SerializedPattern | undefined = await db.get(PATTERNS_STORE, id);
  return row ? deserializePattern(row) : null;
}

export async function listPatterns(): Promise<SerializedPattern[]> {
  const db = await getDb();
  const all: SerializedPattern[] = await db.getAll(PATTERNS_STORE);
  return all.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function deletePattern(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(PATTERNS_STORE, id);
}
