'use client';

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Group, Line } from 'react-konva';
import Konva from 'konva';
import { usePatternStore } from '@/stores/patternStore';
import { useToolStore } from '@/stores/toolStore';
import { useUIStore } from '@/stores/uiStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { GridLayer } from './GridLayer';
import { StitchLayer } from './StitchLayer';
import { ToolOverlay } from './ToolOverlay';
import { Stitch } from '@/types/pattern';
import { floodFill } from '@/lib/canvas/floodFill';
import {
  drawLine,
  drawRectangle,
  drawCircle,
  getShapePreviewPoints,
  getLinePoints,
} from '@/lib/canvas/shapes';
import {
  isCellInBoundary,
  getBoundaryBBox,
  SelectionBoundary,
} from '@/lib/canvas/polygon';
import dmcColors from '@/data/dmcColors.json';

const BASE_CELL_SIZE = 20;
const HANDLE_PX = 8; // handle square size in stage pixels

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const RESIZE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize', se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
};

// Build DMC hex lookup
const dmcHexMap = new Map<string, string>();
for (const c of dmcColors) {
  dmcHexMap.set(c.code, c.hex);
}

/** Nearest-neighbor scale of floating stitches into a new bounding box. */
function scaleStitches(
  stitches: Stitch[],
  srcMinX: number, srcMinY: number, srcMaxX: number, srcMaxY: number,
  dstMinX: number, dstMinY: number, dstMaxX: number, dstMaxY: number,
): Stitch[] {
  const oldW = srcMaxX - srcMinX + 1;
  const oldH = srcMaxY - srcMinY + 1;
  const newW = dstMaxX - dstMinX + 1;
  const newH = dstMaxY - dstMinY + 1;

  const srcMap = new Map<string, string>(); // "lx,ly" → dmcCode
  for (const s of stitches) {
    srcMap.set(`${s.x - srcMinX},${s.y - srcMinY}`, s.dmcCode);
  }

  const result: Stitch[] = [];
  for (let ny = 0; ny < newH; ny++) {
    for (let nx = 0; nx < newW; nx++) {
      const ox = oldW <= 1 ? 0 : Math.round(nx * (oldW - 1) / Math.max(1, newW - 1));
      const oy = oldH <= 1 ? 0 : Math.round(ny * (oldH - 1) / Math.max(1, newH - 1));
      const code = srcMap.get(`${ox},${oy}`);
      if (code) result.push({ x: dstMinX + nx, y: dstMinY + ny, dmcCode: code });
    }
  }
  return result;
}

export function StitchCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  // Drawing interpolation - track last draw position
  const lastDrawPosRef = useRef<{ x: number; y: number } | null>(null);

  // Move drag state
  const [isDraggingMove, setIsDraggingMove] = useState(false);
  const moveDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [currentMoveOffset, setCurrentMoveOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Ref so window-level handlers always read the latest offset without stale closures
  const currentMoveOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Marquee rectangle selection state
  const [isSelectDragging, setIsSelectDragging] = useState(false);
  const [selectRectStart, setSelectRectStart] = useState<{ x: number; y: number } | null>(null);
  const [selectRectEnd, setSelectRectEnd] = useState<{ x: number; y: number } | null>(null);
  const selectShiftRef = useRef(false);

  // Lasso selection state
  // lassoPathRef holds the full accumulated path (mutable, no re-renders)
  // lassoPath (state) is only synced every N points for the visual preview
  const lassoPathRef = useRef<Array<{ x: number; y: number }>>([]);
  const lassoRenderCounter = useRef(0);
  const [lassoPath, setLassoPath] = useState<Array<{ x: number; y: number }>>([]);
  const lastLassoPosRef = useRef<{ x: number; y: number } | null>(null);

  // Pattern store
  const pattern = usePatternStore((s) => s.pattern);
  const addStitches = usePatternStore((s) => s.addStitches);
  const removeStitches = usePatternStore((s) => s.removeStitches);
  const pushHistory = usePatternStore((s) => s.pushHistory);

  // Tool store
  const currentTool = useToolStore((s) => s.currentTool);
  const currentColor = useToolStore((s) => s.currentColor);
  const pencilSize = useToolStore((s) => s.pencilSize);
  const eraserSize = useToolStore((s) => s.eraserSize);
  const shapeMode = useToolStore((s) => s.shapeMode);
  const outlineColor = useToolStore((s) => s.outlineColor);
  const fillColor = useToolStore((s) => s.fillColor);
  const selectionMode = useToolStore((s) => s.selectionMode);

  // UI store
  const zoom = useUIStore((s) => s.zoom);
  const panX = useUIStore((s) => s.panX);
  const panY = useUIStore((s) => s.panY);
  const showGrid = useUIStore((s) => s.showGrid);
  const viewMode = useUIStore((s) => s.viewMode);
  const setZoom = useUIStore((s) => s.setZoom);
  const setPan = useUIStore((s) => s.setPan);

  // Resize selection state
  const [isResizing, setIsResizing] = useState(false);
  const [hoverHandle, setHoverHandle] = useState<ResizeHandle | null>(null);
  const resizingHandleRef = useRef<ResizeHandle | null>(null);
  const resizeOriginRef = useRef<{
    stitches: Stitch[];
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
    startX: number; startY: number; // grid coords at drag start
  } | null>(null);

  // Selection store
  const selectionBoundary = useSelectionStore((s) => s.selectionBoundary);
  const movingStitches = useSelectionStore((s) => s.movingStitches);
  const isMoving = useSelectionStore((s) => s.isMoving);
  const isPlacing = useSelectionStore((s) => s.isPlacing);
  const originalMovingPositions = useSelectionStore((s) => s.originalMovingPositions);
  const hasResized = useSelectionStore((s) => s.hasResized);
  const setBoundary = useSelectionStore((s) => s.setBoundary);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const commitMove = useSelectionStore((s) => s.commitMove);
  const cancelMove = useSelectionStore((s) => s.cancelMove);
  const startMove = useSelectionStore((s) => s.startMove);
  const resizePlacement = useSelectionStore((s) => s.resizePlacement);

  const cellSize = BASE_CELL_SIZE;
  const isShapeTool = currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line';

  // Composite all visible layers bottom-to-top (last index = bottom, 0 = top),
  // filtered to in-bounds cells. During a move drag the moving stitches are
  // excluded from their original positions (they appear at the offset preview).
  const visibleStitches = useMemo(() => {
    if (!pattern) return new Map<string, import('@/types/pattern').Stitch>();
    const composite = new Map<string, import('@/types/pattern').Stitch>();
    for (let i = pattern.layers.length - 1; i >= 0; i--) {
      const layer = pattern.layers[i];
      if (!layer.visible) continue;
      layer.stitches.forEach((stitch, key) => {
        if (stitch.x >= 0 && stitch.y >= 0 && stitch.x < pattern.width && stitch.y < pattern.height) {
          composite.set(key, stitch);
        }
      });
    }
    // Hide the original canvas positions of moved stitches so they don't ghost
    // while floating. We use originalMovingPositions (not movingStitches) because
    // resize can relocate movingStitches to new coords — the canvas originals must
    // still be suppressed regardless.
    if (isMoving && originalMovingPositions.length > 0) {
      originalMovingPositions.forEach((p) => composite.delete(`${p.x},${p.y}`));
    }
    return composite;
  }, [pattern, isMoving, originalMovingPositions]);

  // Window-level mouse tracking during move drag so the drag continues
  // smoothly when the cursor exits the Stage container (left/top edges).
  useEffect(() => {
    if (!isDraggingMove) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!moveDragStartRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const stageX = (e.clientX - rect.left - panX) / zoom;
      const stageY = (e.clientY - rect.top - panY) / zoom;
      const rawX = Math.floor(stageX / cellSize);
      const rawY = Math.floor(stageY / cellSize);
      const newOffset = {
        x: rawX - moveDragStartRef.current.x,
        y: rawY - moveDragStartRef.current.y,
      };
      currentMoveOffsetRef.current = newOffset;
      setCurrentMoveOffset(newOffset);
    };

    const handleWindowMouseUp = () => {
      const offset = currentMoveOffsetRef.current;
      const placing = useSelectionStore.getState().isPlacing;
      // For placements (paste/library): always commit so a single click drops
      // the stitches at the cursor position instead of cancelling.
      // For normal moves: only commit if the selection actually moved.
      if (offset.x !== 0 || offset.y !== 0 || placing) {
        commitMove(offset.x, offset.y);
      } else {
        cancelMove();
      }
      setIsDraggingMove(false);
      moveDragStartRef.current = null;
      const zero = { x: 0, y: 0 };
      setCurrentMoveOffset(zero);
      currentMoveOffsetRef.current = zero;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingMove, panX, panY, zoom, cellSize, commitMove, cancelMove]);

  // Window-level handlers for selection resize drag
  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!resizeOriginRef.current || !resizingHandleRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const gx = Math.floor((e.clientX - rect.left - panX) / zoom / cellSize);
      const gy = Math.floor((e.clientY - rect.top  - panY) / zoom / cellSize);
      const { stitches, bbox, startX, startY } = resizeOriginRef.current;
      const handle = resizingHandleRef.current;
      const dx = gx - startX;
      const dy = gy - startY;

      // Compute new bbox based on which handle is dragged
      let { minX, minY, maxX, maxY } = bbox;
      if (handle === 'nw' || handle === 'w'  || handle === 'sw') minX = Math.min(bbox.minX + dx, bbox.maxX);
      if (handle === 'ne' || handle === 'e'  || handle === 'se') maxX = Math.max(bbox.minX, bbox.maxX + dx);
      if (handle === 'nw' || handle === 'n'  || handle === 'ne') minY = Math.min(bbox.minY + dy, bbox.maxY);
      if (handle === 'sw' || handle === 's'  || handle === 'se') maxY = Math.max(bbox.minY, bbox.maxY + dy);

      const scaled = scaleStitches(stitches, bbox.minX, bbox.minY, bbox.maxX, bbox.maxY, minX, minY, maxX, maxY);
      const newBoundary: SelectionBoundary = { kind: 'rect', minX, minY, maxX, maxY };
      resizePlacement(scaled, newBoundary);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      resizingHandleRef.current = null;
      resizeOriginRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, panX, panY, zoom, cellSize, resizePlacement]);

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Convert stage coordinates to grid cell
  const stageToGrid = useCallback(
    (stageX: number, stageY: number): { x: number; y: number } | null => {
      if (!pattern) return null;
      const x = Math.floor(stageX / cellSize);
      const y = Math.floor(stageY / cellSize);
      if (x < 0 || y < 0 || x >= pattern.width || y >= pattern.height) return null;
      return { x, y };
    },
    [pattern, cellSize]
  );

  // Get cells affected by brush at position
  const getCellsInBrush = useCallback(
    (centerX: number, centerY: number, size: number): Array<{ x: number; y: number }> => {
      if (!pattern) return [];
      const cells: Array<{ x: number; y: number }> = [];
      const offset = Math.floor(size / 2);
      for (let dx = 0; dx < size; dx++) {
        for (let dy = 0; dy < size; dy++) {
          const x = centerX - offset + dx;
          const y = centerY - offset + dy;
          if (x >= 0 && y >= 0 && x < pattern.width && y < pattern.height) {
            cells.push({ x, y });
          }
        }
      }
      return cells;
    },
    [pattern]
  );

  // Apply brush along interpolated line between two grid points
  const applyBrushLine = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      if (!pattern) return;
      const brushSize = currentTool === 'pencil' ? pencilSize : eraserSize;

      const linePoints = getLinePoints(fromX, fromY, toX, toY, pattern.width, pattern.height);

      const seen = new Set<string>();
      const allCells: Array<{ x: number; y: number }> = [];

      for (const pt of linePoints) {
        const brushCells = getCellsInBrush(pt.x, pt.y, brushSize);
        for (const cell of brushCells) {
          const key = `${cell.x},${cell.y}`;
          if (!seen.has(key)) {
            seen.add(key);
            allCells.push(cell);
          }
        }
      }

      if (currentTool === 'pencil') {
        const stitches: Stitch[] = allCells.map((c) => ({
          x: c.x,
          y: c.y,
          dmcCode: currentColor,
        }));
        addStitches(stitches);
      } else if (currentTool === 'eraser') {
        removeStitches(allCells);
      }
    },
    [pattern, currentTool, currentColor, pencilSize, eraserSize, getCellsInBrush, addStitches, removeStitches]
  );

  // Apply brush at a single point
  const applyBrushAt = useCallback(
    (gridX: number, gridY: number) => {
      if (!pattern) return;
      if (currentTool === 'pencil') {
        const cells = getCellsInBrush(gridX, gridY, pencilSize);
        const stitches: Stitch[] = cells.map((c) => ({
          x: c.x,
          y: c.y,
          dmcCode: currentColor,
        }));
        addStitches(stitches);
      } else if (currentTool === 'eraser') {
        const cells = getCellsInBrush(gridX, gridY, eraserSize);
        removeStitches(cells);
      }
    },
    [pattern, currentTool, currentColor, pencilSize, eraserSize, getCellsInBrush, addStitches, removeStitches]
  );

  // Get client coordinates from mouse or touch event
  const getClientPos = (evt: MouseEvent | TouchEvent): { x: number; y: number } => {
    if ('clientX' in evt) {
      return { x: evt.clientX, y: evt.clientY };
    }
    if (evt.touches && evt.touches.length > 0) {
      return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
    }
    return { x: 0, y: 0 };
  };

  // Pointer down
  const handlePointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!pattern) return;

      const evt = e.evt;
      const isCtrl = ('ctrlKey' in evt && evt.ctrlKey) || ('metaKey' in evt && evt.metaKey);
      const isMiddleButton = 'button' in evt && evt.button === 1;
      const isShift = 'shiftKey' in evt && evt.shiftKey;

      // 1. Pan: Ctrl+click, middle mouse button, or pan tool
      if (isCtrl || isMiddleButton || currentTool === 'pan') {
        evt.preventDefault();
        setIsPanning(true);
        const clientPos = getClientPos(evt);
        panStartRef.current = { x: clientPos.x - panX, y: clientPos.y - panY };
        return;
      }

      // 2. Only left click for drawing/selecting
      if ('button' in evt && evt.button !== 0) return;

      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      const gridPos = stageToGrid(pos.x, pos.y);

      // 3a. Resize handle hit test — takes priority over move/select
      if (currentTool === 'select' && isMoving && selectionBoundary && gridPos) {
        const bbox = getBoundaryBBox(selectionBoundary);
        const ox = currentMoveOffsetRef.current.x;
        const oy = currentMoveOffsetRef.current.y;
        const x1 = (bbox.minX + ox) * cellSize;
        const y1 = (bbox.minY + oy) * cellSize;
        const x2 = (bbox.maxX + ox + 1) * cellSize;
        const y2 = (bbox.maxY + oy + 1) * cellSize;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const h = HANDLE_PX;
        const handles: Array<{ type: ResizeHandle; hx: number; hy: number }> = [
          { type: 'nw', hx: x1, hy: y1 }, { type: 'n', hx: mx, hy: y1 }, { type: 'ne', hx: x2, hy: y1 },
          { type: 'e',  hx: x2, hy: my },
          { type: 'se', hx: x2, hy: y2 }, { type: 's', hx: mx, hy: y2 }, { type: 'sw', hx: x1, hy: y2 },
          { type: 'w',  hx: x1, hy: my },
        ];
        const stagePos = stage.getRelativePointerPosition()!;
        for (const handle of handles) {
          if (Math.abs(stagePos.x - handle.hx) <= h && Math.abs(stagePos.y - handle.hy) <= h) {
            // Start resize from the current (possibly offset) bounding box
            const offsetBbox = {
              minX: bbox.minX + ox, minY: bbox.minY + oy,
              maxX: bbox.maxX + ox, maxY: bbox.maxY + oy,
            };
            resizingHandleRef.current = handle.type;
            resizeOriginRef.current = {
              stitches: useSelectionStore.getState().movingStitches.map((s) => ({
                x: s.x + ox, y: s.y + oy, dmcCode: s.dmcCode,
              })),
              bbox: offsetBbox,
              startX: gridPos.x,
              startY: gridPos.y,
            };
            // Reset move offset so resize works from absolute positions
            setCurrentMoveOffset({ x: 0, y: 0 });
            currentMoveOffsetRef.current = { x: 0, y: 0 };
            setIsResizing(true);
            return;
          }
        }
      }

      // 3. Select tool
      if (currentTool === 'select') {
        // 3a. Move drag: isMoving from toolbar OR click inside selection boundary without shift
        if (
          gridPos &&
          !isShift &&
          (isMoving || (selectionBoundary && isCellInBoundary(gridPos.x, gridPos.y, selectionBoundary)))
        ) {
          if (!isMoving) {
            startMove();
          }
          setIsDraggingMove(true);
          // For paste/library placement (isPlacing), stitches start at (0,0).
          // Setting dragStart to (0,0) makes the offset equal to the cursor
          // position, so the floating preview tracks the cursor naturally.
          moveDragStartRef.current = isPlacing ? { x: 0, y: 0 } : gridPos;
          const zero = { x: 0, y: 0 };
          setCurrentMoveOffset(zero);
          currentMoveOffsetRef.current = zero;
          return;
        }

        // 3b. Selection drag (rectangle or lasso).
        // If floating stitches exist and were resized (or are a placement), commit
        // them at their current positions before starting a new selection.
        // Otherwise (plain selection with no changes) cancel to discard.
        if (gridPos) {
          if (!isShift) {
            if (isMoving && (hasResized || isPlacing)) {
              commitMove(0, 0);
            } else {
              clearSelection();
            }
          }
          selectShiftRef.current = isShift;

          if (selectionMode === 'lasso') {
            const stagePoint = { x: pos.x / cellSize, y: pos.y / cellSize };
            lassoPathRef.current = [stagePoint];
            lassoRenderCounter.current = 0;
            setLassoPath([stagePoint]);
            lastLassoPosRef.current = stagePoint;
            setIsSelectDragging(true);
          } else {
            setIsSelectDragging(true);
            setSelectRectStart(gridPos);
            setSelectRectEnd(gridPos);
          }
        } else {
          if (isMoving && (hasResized || isPlacing)) {
            commitMove(0, 0);
          } else {
            clearSelection();
          }
        }
        return;
      }

      if (!gridPos) return;

      // 4. Fill bucket — reads active layer only for boundary detection,
      //    writes result to the active layer via addStitches.
      if (currentTool === 'fill') {
        pushHistory();
        const activeLayer = pattern.layers.find((l) => l.id === pattern.activeLayerId);
        const layerStitches = activeLayer?.stitches ?? new Map<string, Stitch>();
        const newStitches = floodFill(
          layerStitches,
          gridPos.x,
          gridPos.y,
          currentColor,
          pattern.width,
          pattern.height
        );
        if (newStitches.length > 0) {
          addStitches(newStitches);
        }
        return;
      }

      // 5. Shape tool drag start
      if (isShapeTool) {
        pushHistory();
        setIsDrawing(true);
        setDragStart(gridPos);
        setDragEnd(gridPos);
        return;
      }

      // 6. Pencil / Eraser: continuous drawing with interpolation
      pushHistory();
      setIsDrawing(true);
      lastDrawPosRef.current = gridPos;
      applyBrushAt(gridPos.x, gridPos.y);
    },
    [pattern, currentTool, currentColor, isShapeTool, isMoving, isPlacing, hasResized, selectionMode, selectionBoundary,
     stageToGrid, pushHistory, addStitches, applyBrushAt, panX, panY, cellSize,
     clearSelection, startMove, commitMove]
  );

  // Pointer move
  const handlePointerMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // 1. Panning
      if (isPanning && panStartRef.current) {
        const clientPos = getClientPos(e.evt);
        setPan(clientPos.x - panStartRef.current.x, clientPos.y - panStartRef.current.y);
        return;
      }

      const stage = stageRef.current;
      if (!stage || !pattern) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      const gridPos = stageToGrid(pos.x, pos.y);

      // Hover handle detection for resize cursor (only when not actively dragging)
      if (currentTool === 'select' && isMoving && selectionBoundary && !isDraggingMove && !isResizing) {
        const bbox = getBoundaryBBox(selectionBoundary);
        const x1 = bbox.minX * cellSize; const y1 = bbox.minY * cellSize;
        const x2 = (bbox.maxX + 1) * cellSize; const y2 = (bbox.maxY + 1) * cellSize;
        const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
        const h = HANDLE_PX;
        const candidates: Array<{ type: ResizeHandle; hx: number; hy: number }> = [
          { type: 'nw', hx: x1, hy: y1 }, { type: 'n', hx: mx, hy: y1 }, { type: 'ne', hx: x2, hy: y1 },
          { type: 'e', hx: x2, hy: my },
          { type: 'se', hx: x2, hy: y2 }, { type: 's', hx: mx, hy: y2 }, { type: 'sw', hx: x1, hy: y2 },
          { type: 'w', hx: x1, hy: my },
        ];
        let found: ResizeHandle | null = null;
        for (const c of candidates) {
          if (Math.abs(pos.x - c.hx) <= h && Math.abs(pos.y - c.hy) <= h) { found = c.type; break; }
        }
        setHoverHandle(found);
      } else if (hoverHandle !== null) {
        setHoverHandle(null);
      }

      if (!gridPos) return;

      // 3. Selection dragging
      if (isSelectDragging) {
        if (selectionMode === 'lasso' && lastLassoPosRef.current) {
          const stagePoint = { x: pos.x / cellSize, y: pos.y / cellSize };
          const from = lastLassoPosRef.current;
          const dist = Math.hypot(stagePoint.x - from.x, stagePoint.y - from.y);
          if (dist > 0.5) {
            lassoPathRef.current.push(stagePoint);
            lastLassoPosRef.current = stagePoint;
            lassoRenderCounter.current += 1;
            // Throttle: sync visual state every 8 new points
            if (lassoRenderCounter.current % 8 === 0) {
              setLassoPath([...lassoPathRef.current]);
            }
          }
        } else {
          setSelectRectEnd(gridPos);
        }
        return;
      }

      if (!isDrawing) return;

      // 4. Shape preview -> update dragEnd
      if (isShapeTool) {
        setDragEnd(gridPos);
        return;
      }

      // 5. Pencil / Eraser -> interpolated brush line
      if (lastDrawPosRef.current) {
        applyBrushLine(
          lastDrawPosRef.current.x, lastDrawPosRef.current.y,
          gridPos.x, gridPos.y
        );
      }
      lastDrawPosRef.current = gridPos;
    },
    [isPanning, isDrawing, isSelectDragging, selectionMode, cellSize,
     pattern, isShapeTool, stageToGrid, applyBrushLine, setPan,
     currentTool, isMoving, selectionBoundary, isDraggingMove, isResizing, hoverHandle]
  );

  // Pointer up
  const handlePointerUp = useCallback(() => {
    // 1. Panning -> stop
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

    // 2. Move drag -> handled by window-level mouseup listener; return early so
    //    onMouseLeave (which calls this) doesn't accidentally commit the move.
    if (isDraggingMove) return;

    // 3. Selection -> finalize boundary
    if (isSelectDragging) {
      const shiftHeld = selectShiftRef.current;

      if (selectionMode === 'lasso') {
        const path = lassoPathRef.current;
        if (path.length >= 3) {
          const newBoundary: SelectionBoundary = { kind: 'lasso', polygon: path };
          if (shiftHeld && selectionBoundary) {
            // Merge: expand to bounding box union
            const aBox = getBoundaryBBox(selectionBoundary);
            const bBox = getBoundaryBBox(newBoundary);
            setBoundary({
              kind: 'rect',
              minX: Math.min(aBox.minX, bBox.minX),
              maxX: Math.max(aBox.maxX, bBox.maxX),
              minY: Math.min(aBox.minY, bBox.minY),
              maxY: Math.max(aBox.maxY, bBox.maxY),
            });
          } else {
            setBoundary(newBoundary);
          }
        }
        lassoPathRef.current = [];
        lassoRenderCounter.current = 0;
        setLassoPath([]);
        lastLassoPosRef.current = null;
      } else if (selectRectStart && selectRectEnd) {
        const minX = Math.min(selectRectStart.x, selectRectEnd.x);
        const maxX = Math.max(selectRectStart.x, selectRectEnd.x);
        const minY = Math.min(selectRectStart.y, selectRectEnd.y);
        const maxY = Math.max(selectRectStart.y, selectRectEnd.y);
        const newBoundary: SelectionBoundary = { kind: 'rect', minX, maxX, minY, maxY };

        if (shiftHeld && selectionBoundary) {
          const aBox = getBoundaryBBox(selectionBoundary);
          setBoundary({
            kind: 'rect',
            minX: Math.min(aBox.minX, minX),
            maxX: Math.max(aBox.maxX, maxX),
            minY: Math.min(aBox.minY, minY),
            maxY: Math.max(aBox.maxY, maxY),
          });
        } else {
          setBoundary(newBoundary);
        }
      }

      setIsSelectDragging(false);
      setSelectRectStart(null);
      setSelectRectEnd(null);
      return;
    }

    // 4. Shape -> commit
    if (pattern && isDrawing && isShapeTool && dragStart && dragEnd) {
      let stitches: Stitch[] = [];

      const effectiveOutlineColor = outlineColor || currentColor;
      const effectiveFillColor = fillColor || currentColor;

      if (currentTool === 'line') {
        stitches = drawLine(
          dragStart.x, dragStart.y,
          dragEnd.x, dragEnd.y,
          currentColor,
          pattern.width, pattern.height
        );
      } else if (currentTool === 'rectangle') {
        stitches = drawRectangle(
          dragStart.x, dragStart.y,
          dragEnd.x, dragEnd.y,
          {
            shapeMode,
            outlineColor: effectiveOutlineColor,
            fillColor: effectiveFillColor,
            width: pattern.width,
            height: pattern.height,
          }
        );
      } else if (currentTool === 'circle') {
        stitches = drawCircle(
          dragStart.x, dragStart.y,
          dragEnd.x, dragEnd.y,
          {
            shapeMode,
            outlineColor: effectiveOutlineColor,
            fillColor: effectiveFillColor,
            width: pattern.width,
            height: pattern.height,
          }
        );
      }

      if (stitches.length > 0) {
        addStitches(stitches);
      }
    }

    // 5. Drawing -> reset
    setIsDrawing(false);
    setDragStart(null);
    setDragEnd(null);
    lastDrawPosRef.current = null;
  }, [
    isPanning, isDraggingMove, isSelectDragging,
    selectRectStart, selectRectEnd, selectionMode, selectionBoundary,
    pattern, isDrawing, isShapeTool, dragStart, dragEnd,
    currentTool, currentColor, outlineColor, fillColor, shapeMode,
    addStitches, setBoundary,
  ]);

  // Scroll to zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      const mousePointTo = {
        x: (pointer.x - panX) / oldScale,
        y: (pointer.y - panY) / oldScale,
      };

      const newPanX = pointer.x - mousePointTo.x * clampedScale;
      const newPanY = pointer.y - mousePointTo.y * clampedScale;

      setZoom(clampedScale);
      setPan(newPanX, newPanY);
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  // Shape preview points
  const previewPoints = useMemo(() => {
    if (!isDrawing || !isShapeTool || !dragStart || !dragEnd || !pattern) return [];
    return getShapePreviewPoints(
      currentTool as 'rectangle' | 'circle' | 'line',
      dragStart.x, dragStart.y,
      dragEnd.x, dragEnd.y,
      shapeMode,
      pattern.width, pattern.height
    );
  }, [isDrawing, isShapeTool, dragStart, dragEnd, currentTool, shapeMode, pattern]);

  // No clamping — patterns can be moved freely off-canvas and are preserved.
  // The visibleStitches memo handles hiding them until moved back into bounds.
  const clampedMoveOffset = currentMoveOffset;

  // Marquee preview rectangle for rendering during drag
  const marqueeRect = useMemo(() => {
    if (!isSelectDragging || selectionMode !== 'rectangle' || !selectRectStart || !selectRectEnd) return null;
    const minX = Math.min(selectRectStart.x, selectRectEnd.x);
    const maxX = Math.max(selectRectStart.x, selectRectEnd.x);
    const minY = Math.min(selectRectStart.y, selectRectEnd.y);
    const maxY = Math.max(selectRectStart.y, selectRectEnd.y);
    return {
      x: minX * cellSize,
      y: minY * cellSize,
      width: (maxX - minX + 1) * cellSize,
      height: (maxY - minY + 1) * cellSize,
    };
  }, [isSelectDragging, selectionMode, selectRectStart, selectRectEnd, cellSize]);

  // Lasso path as flat array for Konva Line [x1, y1, x2, y2, ...]
  const lassoFlatPoints = useMemo(() => {
    if (!isSelectDragging || selectionMode !== 'lasso' || lassoPath.length < 2) return null;
    const flat: number[] = [];
    for (const p of lassoPath) {
      flat.push(p.x * cellSize, p.y * cellSize);
    }
    return flat;
  }, [isSelectDragging, selectionMode, lassoPath, cellSize]);

  // Selection boundary flat points for lasso rendering (offset during drag)
  const selectionLassoPoints = useMemo(() => {
    if (!selectionBoundary || selectionBoundary.kind !== 'lasso') return null;
    const ox = isDraggingMove ? clampedMoveOffset.x : 0;
    const oy = isDraggingMove ? clampedMoveOffset.y : 0;
    const flat: number[] = [];
    for (const p of selectionBoundary.polygon) {
      flat.push((p.x + ox) * cellSize, (p.y + oy) * cellSize);
    }
    return flat;
  }, [selectionBoundary, isDraggingMove, clampedMoveOffset, cellSize]);

  // Resolved boundary rect for rendering (offset during drag)
  const selectionRectProps = useMemo(() => {
    if (!selectionBoundary || selectionBoundary.kind !== 'rect') return null;
    const ox = isDraggingMove ? clampedMoveOffset.x : 0;
    const oy = isDraggingMove ? clampedMoveOffset.y : 0;
    return {
      x: (selectionBoundary.minX + ox) * cellSize,
      y: (selectionBoundary.minY + oy) * cellSize,
      width: (selectionBoundary.maxX - selectionBoundary.minX + 1) * cellSize,
      height: (selectionBoundary.maxY - selectionBoundary.minY + 1) * cellSize,
    };
  }, [selectionBoundary, isDraggingMove, clampedMoveOffset, cellSize]);

  // Moving stitch previews (shown whenever stitches are floating — before and
  // during drag — offset by the current move offset which is 0,0 until drag).
  const movingStitchRects = useMemo(() => {
    if (!isMoving || movingStitches.length === 0) return null;
    const ox = clampedMoveOffset.x;
    const oy = clampedMoveOffset.y;
    return movingStitches.map((s) => ({
      key: `mv-${s.x},${s.y}`,
      x: (s.x + ox) * cellSize,
      y: (s.y + oy) * cellSize,
      fill: dmcHexMap.get(s.dmcCode) ?? '#888888',
    }));
  }, [isMoving, movingStitches, clampedMoveOffset, cellSize]);

  // Resize handle positions in stage-pixel coords (shown when floating selection exists)
  const resizeHandleRects = useMemo(() => {
    if (!isMoving || !selectionBoundary) return null;
    const bbox = getBoundaryBBox(selectionBoundary);
    const ox = isDraggingMove ? clampedMoveOffset.x : 0;
    const oy = isDraggingMove ? clampedMoveOffset.y : 0;
    const x1 = (bbox.minX + ox) * cellSize;
    const y1 = (bbox.minY + oy) * cellSize;
    const x2 = (bbox.maxX + ox + 1) * cellSize;
    const y2 = (bbox.maxY + oy + 1) * cellSize;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const h = HANDLE_PX;
    return [
      { type: 'nw' as ResizeHandle, hx: x1, hy: y1 },
      { type: 'n'  as ResizeHandle, hx: mx, hy: y1 },
      { type: 'ne' as ResizeHandle, hx: x2, hy: y1 },
      { type: 'e'  as ResizeHandle, hx: x2, hy: my },
      { type: 'se' as ResizeHandle, hx: x2, hy: y2 },
      { type: 's'  as ResizeHandle, hx: mx, hy: y2 },
      { type: 'sw' as ResizeHandle, hx: x1, hy: y2 },
      { type: 'w'  as ResizeHandle, hx: x1, hy: my },
    ].map((h2) => ({ ...h2, x: h2.hx - h / 2, y: h2.hy - h / 2, size: h }));
  }, [isMoving, selectionBoundary, isDraggingMove, clampedMoveOffset, cellSize]);

  // Resolve hex colors for preview
  const outlineHex = dmcHexMap.get(outlineColor || currentColor) || '#000000';
  const fillHex = dmcHexMap.get(fillColor || currentColor) || '#FF0000';

  if (!pattern) return null;

  // Cursor based on tool and state
  let cursor = 'crosshair';
  if (currentTool === 'fill') cursor = 'cell';
  if (currentTool === 'pan') cursor = isPanning ? 'grabbing' : 'grab';
  if (currentTool === 'select') cursor = 'default';
  if (isDraggingMove) cursor = 'move';
  if (isResizing && resizingHandleRef.current) cursor = RESIZE_CURSORS[resizingHandleRef.current];
  if (!isDraggingMove && !isResizing && hoverHandle) cursor = RESIZE_CURSORS[hoverHandle];
  if (isPanning && currentTool !== 'pan') cursor = 'grabbing';

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-800"
      style={{ cursor }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
      >
        <Layer listening={false}>
          <GridLayer
            width={pattern.width}
            height={pattern.height}
            cellSize={cellSize}
            fabricColor={pattern.fabricColor}
            showGrid={showGrid}
          />
        </Layer>
        <Layer listening={false}>
          <StitchLayer
            stitches={visibleStitches}
            cellSize={cellSize}
            viewMode={viewMode}
          />
        </Layer>
        <Layer listening={false}>
          <ToolOverlay
            previewPoints={previewPoints}
            cellSize={cellSize}
            outlineColor={outlineHex}
            fillColor={fillHex}
          />

          {/* Selection boundary outline — one shape regardless of how many cells are selected */}
          {selectionRectProps && (
            <Rect
              {...selectionRectProps}
              fill="rgba(59,130,246,0.12)"
              stroke="#2563EB"
              strokeWidth={1.5}
              dash={[6, 3]}
              listening={false}
            />
          )}
          {selectionLassoPoints && (
            <Line
              points={selectionLassoPoints}
              closed
              fill="rgba(59,130,246,0.12)"
              stroke="#2563EB"
              strokeWidth={1.5}
              dash={[6, 3]}
              listening={false}
            />
          )}

          {/* Moving stitch previews during drag */}
          {movingStitchRects && (
            <Group listening={false}>
              {movingStitchRects.map((s) => (
                <Rect
                  key={s.key}
                  x={s.x}
                  y={s.y}
                  width={cellSize}
                  height={cellSize}
                  fill={s.fill}
                  opacity={0.75}
                  listening={false}
                />
              ))}
            </Group>
          )}

          {/* Marquee selection rectangle (during drag, before release) */}
          {marqueeRect && (
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.width}
              height={marqueeRect.height}
              fill="#3B82F6"
              opacity={0.15}
              stroke="#2563EB"
              strokeWidth={1.5}
              dash={[6, 3]}
              listening={false}
            />
          )}

          {/* Lasso path preview (during drag, before release) */}
          {lassoFlatPoints && (
            <Line
              points={lassoFlatPoints}
              stroke="#2563EB"
              strokeWidth={1.5}
              dash={[6, 3]}
              closed
              fill="#3B82F6"
              opacity={0.2}
              listening={false}
            />
          )}

          {/* Resize handles — shown when floating selection is active */}
          {resizeHandleRects && resizeHandleRects.map((h) => (
            <Rect
              key={h.type}
              x={h.x}
              y={h.y}
              width={h.size}
              height={h.size}
              fill="white"
              stroke="#2563EB"
              strokeWidth={1.5}
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
