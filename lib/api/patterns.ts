// Pattern storage: the browser (IndexedDB) copy is always written first, then
// the backend when it's reachable. Anything the server missed is marked
// pending and uploaded by `syncPending()` once the server is back.

import { api, ApiError, isOfflineError } from './client';
import { ensureSession } from './session';
import { Pattern, SerializedPattern } from '@/types/pattern';
import {
  serializePattern,
  deserializePattern,
  saveLocal,
  getLocal,
  listLocal,
  deleteLocal,
  markSynced,
  LocalRecord,
} from '@/lib/db/patternDB';

export interface PatternSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Saved in this browser but not yet on the server. */
  pendingSync?: boolean;
}

interface PatternResponse {
  id: string;
  name: string;
  data: string;
  createdAt: string;
  updatedAt: string;
}

/** 'synced' = on the server too; 'local' = only in this browser (server offline). */
export type SaveResult = 'synced' | 'local';

// ── Deletes made while offline ───────────────────────────────────────────────

const PENDING_DELETES_KEY = 'xstitch_pending_deletes';

function getPendingDeletes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_DELETES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function setPendingDeletes(ids: string[]): void {
  try {
    localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(ids));
  } catch { /* storage unavailable */ }
}

// ── Server helpers ───────────────────────────────────────────────────────────

async function serverGet(id: string): Promise<SerializedPattern> {
  await ensureSession();
  const res = await api.get<PatternResponse>(`/patterns/${id}`);
  return JSON.parse(res.data) as SerializedPattern;
}

async function serverPut(serialized: SerializedPattern): Promise<void> {
  await ensureSession();
  await api.put<PatternSummary>(`/patterns/${serialized.id}`, {
    name: serialized.name,
    data: JSON.stringify(serialized),
  });
}

function stripLocalFields(record: LocalRecord): SerializedPattern {
  const serialized: LocalRecord = { ...record };
  delete serialized.pendingSync;
  return serialized;
}

function toSummary(r: LocalRecord): PatternSummary {
  return { id: r.id, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt, pendingSync: !!r.pendingSync };
}

const byNewest = (a: PatternSummary, b: PatternSummary) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

// ── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Push offline deletes and pending saves to the server.
 * Returns true if the server was reachable and everything synced.
 */
export async function syncPending(): Promise<boolean> {
  try {
    await ensureSession();

    const deletes = getPendingDeletes();
    for (const id of deletes) {
      try {
        await api.delete<void>(`/patterns/${id}`);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      setPendingDeletes(getPendingDeletes().filter((d) => d !== id));
    }

    const pending = (await listLocal()).filter((r) => r.pendingSync);
    for (const record of pending) {
      // Don't overwrite a newer version saved from another browser.
      let remote: SerializedPattern | null = null;
      try {
        remote = await serverGet(record.id);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      if (remote && new Date(remote.updatedAt) > new Date(record.updatedAt)) {
        await saveLocal(remote, false);
        continue;
      }
      await serverPut(stripLocalFields(record));
      await markSynced(record.id, record.updatedAt);
    }
    return true;
  } catch (err) {
    if (isOfflineError(err)) return false;
    throw err;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function savePattern(pattern: Pattern): Promise<SaveResult> {
  const serialized = serializePattern(pattern);
  await saveLocal(serialized, true);
  setPendingDeletes(getPendingDeletes().filter((d) => d !== pattern.id));

  try {
    await serverPut(serialized);
    await markSynced(pattern.id, serialized.updatedAt);
    return 'synced';
  } catch (err) {
    if (isOfflineError(err)) return 'local';
    throw err;
  }
}

export async function getPattern(id: string): Promise<Pattern> {
  const local = await getLocal(id).catch(() => undefined);
  try {
    const remote = await serverGet(id);
    if (local?.pendingSync && new Date(local.updatedAt) >= new Date(remote.updatedAt)) {
      return deserializePattern(local);
    }
    await saveLocal(remote, false).catch(() => {});
    return deserializePattern(remote);
  } catch (err) {
    const deleted = getPendingDeletes().includes(id);
    if (local && !deleted && (isOfflineError(err) || local.pendingSync)) {
      return deserializePattern(local);
    }
    throw err;
  }
}

export async function listPatterns(): Promise<PatternSummary[]> {
  const local = await listLocal().catch(() => [] as LocalRecord[]);

  try {
    await syncPending().catch(() => false);
    await ensureSession();
    const server = await api.get<PatternSummary[]>('/patterns');
    const serverIds = new Set(server.map((p) => p.id));

    // Drop cached copies the server no longer has (deleted from another browser).
    for (const r of local) {
      if (!serverIds.has(r.id) && !r.pendingSync) await deleteLocal(r.id).catch(() => {});
    }
    const pendingOnly = local.filter((r) => r.pendingSync && !serverIds.has(r.id)).map(toSummary);
    const pendingIds = new Set(local.filter((r) => r.pendingSync).map((r) => r.id));
    const merged = server.map((p) => (pendingIds.has(p.id) ? { ...p, pendingSync: true } : p));
    return [...merged, ...pendingOnly].sort(byNewest);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    const deletes = new Set(getPendingDeletes());
    return local.filter((r) => !deletes.has(r.id)).map(toSummary).sort(byNewest);
  }
}

export async function deletePattern(id: string): Promise<void> {
  await deleteLocal(id).catch(() => {});
  try {
    await ensureSession();
    await api.delete<void>(`/patterns/${id}`);
  } catch (err) {
    if (isOfflineError(err)) {
      setPendingDeletes([...new Set([...getPendingDeletes(), id])]);
      return;
    }
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}
