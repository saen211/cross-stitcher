import { create } from 'zustand';
import { Layer, Pattern, Stitch, PatternMetadata } from '@/types/pattern';
import { generateId } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cloneLayer(layer: Layer): Layer {
  return { ...layer, stitches: new Map(layer.stitches) };
}

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map(cloneLayer);
}

/** Returns the composite view of all visible layers (bottom = last index, top = index 0). */
export function getCompositeStitches(pattern: Pattern): Map<string, Stitch> {
  const composite = new Map<string, Stitch>();
  for (let i = pattern.layers.length - 1; i >= 0; i--) {
    const layer = pattern.layers[i];
    if (!layer.visible) continue;
    layer.stitches.forEach((stitch, key) => composite.set(key, stitch));
  }
  return composite;
}

// ── History ───────────────────────────────────────────────────────────────────

interface HistoryEntry {
  layers: Layer[];
  activeLayerId: string;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface PatternState {
  pattern: Pattern | null;
  history: HistoryEntry[];
  historyIndex: number;
  maxHistory: number;

  // Pattern lifecycle
  createPattern: (name: string, width: number, height: number, fabricCount: number, fabricColor: string) => void;
  loadPattern: (pattern: Pattern) => void;

  // Stitch operations — all write to the active layer
  addStitch: (stitch: Stitch) => void;
  removeStitch: (x: number, y: number) => void;
  addStitches: (stitches: Stitch[]) => void;
  removeStitches: (coords: Array<{ x: number; y: number }>) => void;
  clearPattern: () => void;

  // Pattern metadata
  updatePatternName: (name: string) => void;
  updateMetadata: (metadata: Partial<PatternMetadata>) => void;
  updateFabricColor: (color: string) => void;
  updateFabricCount: (count: number) => void;
  updateGridSize: (width: number, height: number) => void;
  resizePattern: (newWidth: number, newHeight: number) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Layer management
  addLayer: (name?: string) => void;
  deleteLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  flattenLayers: () => void;
  flattenSelectedLayers: (ids: string[]) => void;
}

// ── Store implementation ──────────────────────────────────────────────────────

export const usePatternStore = create<PatternState>((set, get) => ({
  pattern: null,
  history: [],
  historyIndex: -1,
  maxHistory: 50,

  // ── Pattern lifecycle ──────────────────────────────────────────────────────

  createPattern: (name, width, height, fabricCount, fabricColor) => {
    const layerId = generateId();
    const layer: Layer = { id: layerId, name: 'Background', visible: true, stitches: new Map() };
    const pattern: Pattern = {
      id: generateId(),
      name, width, height, fabricCount, fabricColor,
      layers: [layer],
      activeLayerId: layerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set({
      pattern,
      history: [{ layers: [cloneLayer(layer)], activeLayerId: layerId }],
      historyIndex: 0,
    });
  },

  loadPattern: (pattern) => {
    set({
      pattern,
      history: [{ layers: cloneLayers(pattern.layers), activeLayerId: pattern.activeLayerId }],
      historyIndex: 0,
    });
  },

  // ── Stitch operations (active layer only) ─────────────────────────────────

  addStitch: (stitch) => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((layer) => {
        if (layer.id !== state.pattern!.activeLayerId) return layer;
        const stitches = new Map(layer.stitches);
        stitches.set(`${stitch.x},${stitch.y}`, stitch);
        return { ...layer, stitches };
      });
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  removeStitch: (x, y) => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((layer) => {
        if (layer.id !== state.pattern!.activeLayerId) return layer;
        const stitches = new Map(layer.stitches);
        stitches.delete(`${x},${y}`);
        return { ...layer, stitches };
      });
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  addStitches: (newStitches) => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((layer) => {
        if (layer.id !== state.pattern!.activeLayerId) return layer;
        const stitches = new Map(layer.stitches);
        for (const stitch of newStitches) {
          stitches.set(`${stitch.x},${stitch.y}`, stitch);
        }
        return { ...layer, stitches };
      });
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  removeStitches: (coords) => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((layer) => {
        if (layer.id !== state.pattern!.activeLayerId) return layer;
        const stitches = new Map(layer.stitches);
        for (const { x, y } of coords) {
          stitches.delete(`${x},${y}`);
        }
        return { ...layer, stitches };
      });
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  clearPattern: () => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((layer) => {
        if (layer.id !== state.pattern!.activeLayerId) return layer;
        return { ...layer, stitches: new Map<string, Stitch>() };
      });
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  // ── Pattern metadata ───────────────────────────────────────────────────────

  updatePatternName: (name) => {
    set((state) => {
      if (!state.pattern) return state;
      return { pattern: { ...state.pattern, name, updatedAt: new Date() } };
    });
  },

  updateMetadata: (metadata) => {
    set((state) => {
      if (!state.pattern) return state;
      return {
        pattern: {
          ...state.pattern,
          metadata: { ...state.pattern.metadata, ...metadata },
          updatedAt: new Date(),
        },
      };
    });
  },

  updateFabricColor: (color) => {
    set((state) => {
      if (!state.pattern) return state;
      return { pattern: { ...state.pattern, fabricColor: color, updatedAt: new Date() } };
    });
  },

  updateFabricCount: (count) => {
    set((state) => {
      if (!state.pattern) return state;
      return { pattern: { ...state.pattern, fabricCount: count, updatedAt: new Date() } };
    });
  },

  updateGridSize: (width, height) => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((layer) => {
        const stitches = new Map(layer.stitches);
        for (const [key, stitch] of stitches) {
          if (stitch.x >= width || stitch.y >= height) stitches.delete(key);
        }
        return { ...layer, stitches };
      });
      return { pattern: { ...state.pattern, width, height, layers, updatedAt: new Date() } };
    });
  },

  resizePattern: (newWidth, newHeight) => {
    // Push current state to history so the resize is undoable
    get().pushHistory();
    set((state) => {
      if (!state.pattern) return state;
      const { width: oldW, height: oldH } = state.pattern;

      // Nearest-neighbor backward mapping: for each cell in the new grid,
      // find the nearest cell in the old grid and sample from it.
      const sampleX = (nx: number) =>
        oldW <= 1 || newWidth <= 1 ? 0 : Math.round(nx * (oldW - 1) / (newWidth - 1));
      const sampleY = (ny: number) =>
        oldH <= 1 || newHeight <= 1 ? 0 : Math.round(ny * (oldH - 1) / (newHeight - 1));

      const newLayers = state.pattern.layers.map((layer) => {
        const newStitches = new Map<string, Stitch>();
        for (let ny = 0; ny < newHeight; ny++) {
          for (let nx = 0; nx < newWidth; nx++) {
            const ox = sampleX(nx);
            const oy = sampleY(ny);
            const stitch = layer.stitches.get(`${ox},${oy}`);
            if (stitch) {
              newStitches.set(`${nx},${ny}`, { ...stitch, x: nx, y: ny });
            }
          }
        }
        return { ...layer, stitches: newStitches };
      });

      return {
        pattern: {
          ...state.pattern,
          width: newWidth,
          height: newHeight,
          layers: newLayers,
          updatedAt: new Date(),
        },
      };
    });
  },

  // ── History ────────────────────────────────────────────────────────────────

  pushHistory: () => {
    set((state) => {
      if (!state.pattern) return state;
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        layers: cloneLayers(state.pattern.layers),
        activeLayerId: state.pattern.activeLayerId,
      });
      if (newHistory.length > state.maxHistory) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    });
  },

  undo: () => {
    set((state) => {
      if (!state.pattern || state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      return {
        pattern: {
          ...state.pattern,
          layers: cloneLayers(entry.layers),
          activeLayerId: entry.activeLayerId,
          updatedAt: new Date(),
        },
        historyIndex: newIndex,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (!state.pattern || state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      return {
        pattern: {
          ...state.pattern,
          layers: cloneLayers(entry.layers),
          activeLayerId: entry.activeLayerId,
          updatedAt: new Date(),
        },
        historyIndex: newIndex,
      };
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ── Layer management ───────────────────────────────────────────────────────

  addLayer: (name) => {
    set((state) => {
      if (!state.pattern) return state;
      const newId = generateId();
      const newLayer: Layer = {
        id: newId,
        name: name ?? `Layer ${state.pattern.layers.length + 1}`,
        visible: true,
        stitches: new Map(),
      };
      return {
        pattern: {
          ...state.pattern,
          layers: [newLayer, ...state.pattern.layers], // new layer on top
          activeLayerId: newId,
          updatedAt: new Date(),
        },
      };
    });
  },

  deleteLayer: (id) => {
    set((state) => {
      if (!state.pattern || state.pattern.layers.length <= 1) return state;
      const newLayers = state.pattern.layers.filter((l) => l.id !== id);
      const newActiveId =
        state.pattern.activeLayerId === id ? newLayers[0].id : state.pattern.activeLayerId;
      return {
        pattern: {
          ...state.pattern,
          layers: newLayers,
          activeLayerId: newActiveId,
          updatedAt: new Date(),
        },
      };
    });
  },

  setActiveLayer: (id) => {
    set((state) => {
      if (!state.pattern) return state;
      return { pattern: { ...state.pattern, activeLayerId: id } };
    });
  },

  // "Up" in the UI list = lower array index = rendered later = visually on top
  moveLayerUp: (id) => {
    set((state) => {
      if (!state.pattern) return state;
      const idx = state.pattern.layers.findIndex((l) => l.id === id);
      if (idx <= 0) return state;
      const layers = [...state.pattern.layers];
      [layers[idx - 1], layers[idx]] = [layers[idx], layers[idx - 1]];
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  moveLayerDown: (id) => {
    set((state) => {
      if (!state.pattern) return state;
      const idx = state.pattern.layers.findIndex((l) => l.id === id);
      if (idx >= state.pattern.layers.length - 1) return state;
      const layers = [...state.pattern.layers];
      [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  toggleLayerVisibility: (id) => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      );
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  renameLayer: (id, name) => {
    set((state) => {
      if (!state.pattern) return state;
      const layers = state.pattern.layers.map((l) =>
        l.id === id ? { ...l, name } : l
      );
      return { pattern: { ...state.pattern, layers, updatedAt: new Date() } };
    });
  },

  flattenLayers: () => {
    set((state) => {
      if (!state.pattern) return state;
      // Composite visible layers bottom-to-top (higher index = bottom)
      const composite = new Map<string, Stitch>();
      for (let i = state.pattern.layers.length - 1; i >= 0; i--) {
        const layer = state.pattern.layers[i];
        if (!layer.visible) continue;
        layer.stitches.forEach((stitch, key) => composite.set(key, stitch));
      }
      const newId = generateId();
      const newLayer: Layer = { id: newId, name: 'Background', visible: true, stitches: composite };
      return {
        pattern: {
          ...state.pattern,
          layers: [newLayer],
          activeLayerId: newId,
          updatedAt: new Date(),
        },
      };
    });
  },

  flattenSelectedLayers: (ids) => {
    set((state) => {
      if (!state.pattern || ids.length < 2) return state;
      const selectedSet = new Set(ids);
      // Preserve original layer order for correct composite (filter keeps order)
      const selectedLayers = state.pattern.layers.filter((l) => selectedSet.has(l.id));
      if (selectedLayers.length < 2) return state;

      // Composite: higher index = bottom of stack, painted first
      const composite = new Map<string, Stitch>();
      for (let i = selectedLayers.length - 1; i >= 0; i--) {
        const layer = selectedLayers[i];
        if (!layer.visible) continue;
        layer.stitches.forEach((stitch, key) => composite.set(key, stitch));
      }

      const newId = generateId();
      const newLayer: Layer = { id: newId, name: 'Merged', visible: true, stitches: composite };

      // Place the merged layer at the position of the top-most selected layer
      // (lowest index = closest to top of visual stack)
      const topMostIndex = Math.min(
        ...ids.map((id) => state.pattern!.layers.findIndex((l) => l.id === id))
      );

      const newLayers: Layer[] = [];
      for (let i = 0; i < state.pattern.layers.length; i++) {
        const layer = state.pattern.layers[i];
        if (!selectedSet.has(layer.id)) {
          newLayers.push(layer);
        } else if (i === topMostIndex) {
          newLayers.push(newLayer);
        }
        // other selected layers are consumed into the merged layer
      }

      const newActiveId = selectedSet.has(state.pattern.activeLayerId)
        ? newId
        : state.pattern.activeLayerId;

      return {
        pattern: {
          ...state.pattern,
          layers: newLayers,
          activeLayerId: newActiveId,
          updatedAt: new Date(),
        },
      };
    });
  },
}));
