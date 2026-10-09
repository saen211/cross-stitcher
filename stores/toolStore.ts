import { create } from 'zustand';
import { ToolType, ToolState, SelectionMode } from '@/types/tool';

interface ToolStoreState extends ToolState {
  setTool: (tool: ToolType) => void;
  setCurrentColor: (dmcCode: string) => void;
  setOutlineColor: (dmcCode: string) => void;
  setFillColor: (dmcCode: string) => void;
  setPencilSize: (size: number) => void;
  setEraserSize: (size: number) => void;
  setShapeMode: (mode: 'outline' | 'filled' | 'both') => void;
  setSelectionMode: (mode: SelectionMode) => void;
}

export const useToolStore = create<ToolStoreState>((set) => ({
  currentTool: 'pencil',
  pencilSize: 1,
  eraserSize: 1,
  shapeMode: 'filled',
  selectionMode: 'rectangle',
  currentColor: '310', // Black by default
  outlineColor: '310',
  fillColor: '321',

  setTool: (tool) => set({ currentTool: tool }),
  setCurrentColor: (dmcCode) => set({ currentColor: dmcCode }),
  setOutlineColor: (dmcCode) => set({ outlineColor: dmcCode }),
  setFillColor: (dmcCode) => set({ fillColor: dmcCode }),
  setPencilSize: (size) => set({ pencilSize: Math.max(1, Math.min(10, size)) }),
  setEraserSize: (size) => set({ eraserSize: Math.max(1, Math.min(10, size)) }),
  setShapeMode: (mode) => set({ shapeMode: mode }),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
}));
