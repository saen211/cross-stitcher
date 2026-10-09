import { create } from 'zustand';
import { ViewState } from '@/types/tool';

export type PanelDock = 'left' | 'right' | 'bottom';
export type PanelId = 'tools' | 'color' | 'grid' | 'layers' | 'library' | 'analysis';

export const ALL_PANELS: PanelId[] = ['tools', 'color', 'grid', 'layers', 'library', 'analysis'];

interface UIStoreState extends ViewState {
  sidebarOpen: boolean;
  toolbarCollapsed: boolean;
  darkMode: boolean;

  // Panel layout
  panelOrder: PanelId[];
  panelDocks: Record<PanelId, PanelDock>;
  panelCollapsed: Record<PanelId, boolean>;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (x: number, y: number) => void;
  setShowGrid: (show: boolean) => void;
  setViewMode: (mode: 'color' | 'symbol') => void;
  setShowColorLegend: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setToolbarCollapsed: (collapsed: boolean) => void;
  toggleDarkMode: () => void;

  // Panel layout actions
  setPanelOrder: (order: PanelId[]) => void;
  setPanelDock: (id: PanelId, dock: PanelDock) => void;
  togglePanelCollapsed: (id: PanelId) => void;

  // Drag state shared across all docks
  draggingPanelId: PanelId | null;
  setDraggingPanelId: (id: PanelId | null) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.25;

const DEFAULT_DOCKS: Record<PanelId, PanelDock> = {
  tools: 'left',
  color: 'left',
  grid: 'left',
  layers: 'left',
  library: 'left',
  analysis: 'left',
};

const DEFAULT_COLLAPSED: Record<PanelId, boolean> = {
  tools: false,
  color: false,
  grid: false,
  layers: false,
  library: false,
  analysis: false,
};

export const useUIStore = create<UIStoreState>((set) => ({
  zoom: 1.0,
  panX: 0,
  panY: 0,
  showGrid: true,
  viewMode: 'color',
  showColorLegend: true,
  sidebarOpen: true,
  toolbarCollapsed: false,
  darkMode: false,

  panelOrder: [...ALL_PANELS],
  panelDocks: { ...DEFAULT_DOCKS },
  panelCollapsed: { ...DEFAULT_COLLAPSED },
  draggingPanelId: null,

  setZoom: (zoom) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(MAX_ZOOM, s.zoom + ZOOM_STEP) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(MIN_ZOOM, s.zoom - ZOOM_STEP) })),
  resetZoom: () => set({ zoom: 1.0, panX: 0, panY: 0 }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setShowGrid: (show) => set({ showGrid: show }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowColorLegend: (show) => set({ showColorLegend: show }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setToolbarCollapsed: (collapsed) => set({ toolbarCollapsed: collapsed }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  setPanelOrder: (order) => set({ panelOrder: order }),
  setPanelDock: (id, dock) =>
    set((s) => ({ panelDocks: { ...s.panelDocks, [id]: dock } })),
  togglePanelCollapsed: (id) =>
    set((s) => ({ panelCollapsed: { ...s.panelCollapsed, [id]: !s.panelCollapsed[id] } })),
  setDraggingPanelId: (id) => set({ draggingPanelId: id }),
}));
