// Tool and view state types

export type ToolType =
  | 'pencil'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'fill'
  | 'eraser'
  | 'pan'
  | 'select';

export type SelectionMode = 'rectangle' | 'lasso';

export interface ToolState {
  currentTool: ToolType;
  pencilSize: number;  // 1 = 1x1, 2 = 2x2, 3 = 3x3, etc.
  eraserSize: number;  // 1 = 1x1, 2 = 2x2, 3 = 3x3, etc.
  shapeMode: 'outline' | 'filled' | 'both';
  selectionMode: SelectionMode;
  currentColor: string; // DMC code for primary drawing
  outlineColor?: string; // DMC code for shape outline
  fillColor?: string;   // DMC code for shape fill
}

export interface ViewState {
  zoom: number;         // 0.1 to 5.0
  panX: number;         // Pan offset X
  panY: number;         // Pan offset Y
  showGrid: boolean;    // Show grid lines
  viewMode: 'color' | 'symbol'; // Color view or symbol guide view
  showColorLegend: boolean; // Show color legend panel
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface GridSettings {
  cellSize: number;  // Size of each stitch cell in pixels (before zoom)
  gridLineWidth: number;
  gridLineColor: string;
}
