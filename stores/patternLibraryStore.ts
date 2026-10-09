import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stitch } from '@/types/pattern';
import { generateId } from '@/lib/utils';

export interface LibraryEntry {
  id: string;
  name: string;
  stitches: Stitch[];   // Relative positions (origin at 0,0)
  width: number;         // Bounding box width
  height: number;        // Bounding box height
  colorCount: number;    // Number of unique DMC colors
  stitchCount: number;   // Total stitches
  createdAt: string;     // ISO date string
}

interface PatternLibraryState {
  entries: LibraryEntry[];

  addEntry: (name: string, stitches: Stitch[]) => LibraryEntry;
  removeEntry: (id: string) => void;
  renameEntry: (id: string, name: string) => void;
}

export const usePatternLibraryStore = create<PatternLibraryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (name, stitches) => {
        // Normalize positions relative to (0,0)
        if (stitches.length === 0) {
          throw new Error('Cannot save empty pattern to library');
        }

        const minX = Math.min(...stitches.map((s) => s.x));
        const minY = Math.min(...stitches.map((s) => s.y));
        const maxX = Math.max(...stitches.map((s) => s.x));
        const maxY = Math.max(...stitches.map((s) => s.y));

        const normalized: Stitch[] = stitches.map((s) => ({
          x: s.x - minX,
          y: s.y - minY,
          dmcCode: s.dmcCode,
        }));

        const colors = new Set(stitches.map((s) => s.dmcCode));

        const entry: LibraryEntry = {
          id: generateId(),
          name,
          stitches: normalized,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
          colorCount: colors.size,
          stitchCount: stitches.length,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          entries: [entry, ...state.entries],
        }));

        return entry;
      },

      removeEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      renameEntry: (id, name) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, name } : e
          ),
        }));
      },
    }),
    {
      name: 'cross-stitch-pattern-library',
    }
  )
);
