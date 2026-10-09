import { create } from 'zustand';
import { Stitch } from '@/types/pattern';
import { usePatternStore } from './patternStore';
import {
  SelectionBoundary,
  getCellsInBoundary,
} from '@/lib/canvas/polygon';

interface SelectionState {
  selectionBoundary: SelectionBoundary | null;
  clipboard: Stitch[];
  isMoving: boolean;
  movingStitches: Stitch[];           // current floating stitches (may be resized)
  isPlacing: boolean;                 // true when stitches float from paste/library (never written to canvas yet)
  originalMovingPositions: Array<{ x: number; y: number }>; // canvas positions to erase on commit (immutable through resize)
  hasResized: boolean;                // true once resizePlacement has been called this session

  // Boundary actions
  setBoundary: (boundary: SelectionBoundary | null) => void;
  clearSelection: () => void;

  // Clipboard
  copySelection: () => void;
  pasteClipboard: (
    offsetX: number,
    offsetY: number,
    patternStore: {
      pattern: { width: number; height: number } | null;
      addStitches: (stitches: Stitch[]) => void;
      pushHistory: () => void;
    }
  ) => void;

  // Move — reads from usePatternStore internally, no arg needed
  startMove: () => void;
  // Place floating stitches (from paste/library) without writing to canvas first
  startPlacement: (stitches: Stitch[]) => void;
  commitMove: (dx: number, dy: number) => void;
  cancelMove: () => void;

  // Resize — update floating stitches and boundary in-place (during live resize drag)
  resizePlacement: (stitches: Stitch[], boundary: SelectionBoundary) => void;

  // Delete — reads from usePatternStore internally
  deleteSelection: () => void;
}

const FLOATING_RESET = {
  isMoving: false,
  movingStitches: [] as Stitch[],
  isPlacing: false,
  originalMovingPositions: [] as Array<{ x: number; y: number }>,
  hasResized: false,
};

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectionBoundary: null,
  clipboard: [],
  ...FLOATING_RESET,

  setBoundary: (boundary) => {
    set({ selectionBoundary: boundary, ...FLOATING_RESET });
  },

  clearSelection: () => {
    set({ selectionBoundary: null, ...FLOATING_RESET });
  },

  copySelection: () => {
    const { selectionBoundary } = get();
    const pattern = usePatternStore.getState().pattern;
    if (!selectionBoundary || !pattern) return;

    const activeLayer = pattern.layers.find((l) => l.id === pattern.activeLayerId);
    if (!activeLayer) return;

    const cells = getCellsInBoundary(selectionBoundary, pattern.width, pattern.height);
    if (cells.length === 0) return;

    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));

    const copiedStitches: Stitch[] = [];
    for (const cell of cells) {
      const stitch = activeLayer.stitches.get(`${cell.x},${cell.y}`);
      if (stitch) {
        copiedStitches.push({
          x: stitch.x - minX,
          y: stitch.y - minY,
          dmcCode: stitch.dmcCode,
        });
      }
    }

    set({ clipboard: copiedStitches });
  },

  pasteClipboard: (offsetX, offsetY, patternStore) => {
    const { clipboard } = get();
    const pattern = patternStore.pattern;
    if (!pattern || clipboard.length === 0) return;

    patternStore.pushHistory();
    const newStitches: Stitch[] = clipboard
      .map((s) => ({
        x: s.x + offsetX,
        y: s.y + offsetY,
        dmcCode: s.dmcCode,
      }))
      .filter((s) => s.x >= 0 && s.y >= 0 && s.x < pattern.width && s.y < pattern.height);

    patternStore.addStitches(newStitches);
  },

  // Move reads from the ACTIVE LAYER only — other layers are untouched.
  startMove: () => {
    const { selectionBoundary } = get();
    const pattern = usePatternStore.getState().pattern;
    if (!selectionBoundary || !pattern) return;

    const activeLayer = pattern.layers.find((l) => l.id === pattern.activeLayerId);
    if (!activeLayer) return;

    const cells = getCellsInBoundary(selectionBoundary, pattern.width, pattern.height);
    const movingStitches: Stitch[] = [];
    for (const cell of cells) {
      const stitch = activeLayer.stitches.get(`${cell.x},${cell.y}`);
      if (stitch) movingStitches.push(stitch);
    }

    set({
      isMoving: true,
      movingStitches,
      isPlacing: false,
      // Lock in the original canvas positions — these never change even if resize
      // later moves movingStitches to different coordinates.
      originalMovingPositions: movingStitches.map((s) => ({ x: s.x, y: s.y })),
      hasResized: false,
    });
  },

  // Place floating stitches (paste/library) — no canvas write until commitMove.
  startPlacement: (stitches) => {
    if (stitches.length === 0) return;
    const minX = Math.min(...stitches.map((s) => s.x));
    const minY = Math.min(...stitches.map((s) => s.y));
    const maxX = Math.max(...stitches.map((s) => s.x));
    const maxY = Math.max(...stitches.map((s) => s.y));
    set({
      isMoving: true,
      isPlacing: true,
      movingStitches: stitches,
      selectionBoundary: { kind: 'rect', minX, maxX, minY, maxY },
      originalMovingPositions: [], // nothing to erase from canvas
      hasResized: false,
    });
  },

  commitMove: (dx, dy) => {
    const state = get();
    const patternStore = usePatternStore.getState();
    const pattern = patternStore.pattern;

    if (!pattern || state.movingStitches.length === 0) {
      set({ selectionBoundary: null, ...FLOATING_RESET });
      return;
    }

    patternStore.pushHistory();

    // For regular moves: remove the ORIGINAL canvas positions (not movingStitches,
    // which may have been repositioned by resize). Then create a dedicated layer.
    // For placements: stitches were never on canvas, skip removal.
    if (!state.isPlacing) {
      patternStore.removeStitches(state.originalMovingPositions);
      // Only create a new "Move" layer if the source layer still has stitches
      // after removal. If it's now empty, reuse it rather than stacking layers.
      const afterRemove = usePatternStore.getState().pattern;
      const sourceLayer = afterRemove?.layers.find((l) => l.id === afterRemove.activeLayerId);
      if (sourceLayer && sourceLayer.stitches.size > 0) {
        usePatternStore.getState().addLayer('Move');
      }
    }

    // Place at new positions — no clamping, patterns are preserved even off-canvas.
    const newStitches: Stitch[] = state.movingStitches.map((s) => ({
      x: s.x + dx,
      y: s.y + dy,
      dmcCode: s.dmcCode,
    }));
    patternStore.addStitches(newStitches);

    // Shift the selection boundary
    const b = state.selectionBoundary;
    let newBoundary: SelectionBoundary | null = null;
    if (b) {
      if (b.kind === 'rect') {
        newBoundary = {
          kind: 'rect',
          minX: b.minX + dx,
          maxX: b.maxX + dx,
          minY: b.minY + dy,
          maxY: b.maxY + dy,
        };
      } else {
        newBoundary = {
          kind: 'lasso',
          polygon: b.polygon.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        };
      }
    }

    set({ selectionBoundary: newBoundary, ...FLOATING_RESET });
  },

  cancelMove: () => {
    set(FLOATING_RESET);
  },

  resizePlacement: (stitches, boundary) => {
    set({ movingStitches: stitches, selectionBoundary: boundary, hasResized: true });
  },

  deleteSelection: () => {
    const { selectionBoundary } = get();
    const patternStore = usePatternStore.getState();
    const pattern = patternStore.pattern;
    if (!selectionBoundary || !pattern) return;

    patternStore.pushHistory();
    const cells = getCellsInBoundary(selectionBoundary, pattern.width, pattern.height);
    patternStore.removeStitches(cells);
    set({ selectionBoundary: null });
  },
}));
