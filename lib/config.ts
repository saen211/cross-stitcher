// Build-time app configuration (NEXT_PUBLIC_* values are inlined at build time).

/**
 * Where patterns are stored:
 * - 'server'  (default): browser copy + backend API, with sync between devices.
 * - 'browser': browser only (IndexedDB). No backend calls; for static hosts like GitHub Pages.
 *   Features that need the backend (AI generation, sync code) are hidden.
 */
export const STORAGE_MODE: 'server' | 'browser' =
  process.env.NEXT_PUBLIC_STORAGE_MODE === 'browser' ? 'browser' : 'server';

export const isBrowserOnly = STORAGE_MODE === 'browser';
