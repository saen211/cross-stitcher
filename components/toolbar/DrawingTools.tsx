'use client';

import React from 'react';
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Minus,
  PaintBucket,
  Hand,
  BoxSelect,
  Undo,
  Redo,
  Trash2,
  Copy,
  Move,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToolStore } from '@/stores/toolStore';
import { usePatternStore } from '@/stores/patternStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { usePanelOrientation } from '@/components/toolbar/PanelShell';
import { ToolType, SelectionMode } from '@/types/tool';

const tools: Array<{ type: ToolType; icon: React.ReactNode; label: string; shortcut: string }> = [
  { type: 'pan', icon: <Hand className="h-4 w-4" />, label: 'Pan / Hand', shortcut: 'H' },
  { type: 'select', icon: <BoxSelect className="h-4 w-4" />, label: 'Select', shortcut: 'S' },
  { type: 'pencil', icon: <Pencil className="h-4 w-4" />, label: 'Pencil', shortcut: 'P' },
  { type: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Eraser', shortcut: 'E' },
  { type: 'fill', icon: <PaintBucket className="h-4 w-4" />, label: 'Fill Bucket', shortcut: 'G' },
  { type: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle', shortcut: 'R' },
  { type: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle', shortcut: 'C' },
  { type: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line', shortcut: 'L' },
];

export function DrawingTools() {
  const currentTool = useToolStore((s) => s.currentTool);
  const setTool = useToolStore((s) => s.setTool);
  const pencilSize = useToolStore((s) => s.pencilSize);
  const setPencilSize = useToolStore((s) => s.setPencilSize);
  const eraserSize = useToolStore((s) => s.eraserSize);
  const setEraserSize = useToolStore((s) => s.setEraserSize);
  const shapeMode = useToolStore((s) => s.shapeMode);
  const setShapeMode = useToolStore((s) => s.setShapeMode);
  const selectionMode = useToolStore((s) => s.selectionMode);
  const setSelectionMode = useToolStore((s) => s.setSelectionMode);

  const undo = usePatternStore((s) => s.undo);
  const redo = usePatternStore((s) => s.redo);
  const canUndo = usePatternStore((s) => s.canUndo);
  const canRedo = usePatternStore((s) => s.canRedo);

  const selectionBoundary = useSelectionStore((s) => s.selectionBoundary);
  const hasSelection = selectionBoundary !== null;
  const copySelection = useSelectionStore((s) => s.copySelection);
  const startMove = useSelectionStore((s) => s.startMove);
  const deleteSelection = useSelectionStore((s) => s.deleteSelection);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const isShapeTool = ['rectangle', 'circle', 'line'].includes(currentTool);
  const horizontal = usePanelOrientation();

  const undoRedoButtons = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { undo(); clearSelection(); }} disabled={!canUndo()}>
            <Undo className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { redo(); clearSelection(); }} disabled={!canRedo()}>
            <Redo className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
      </Tooltip>
    </>
  );

  const toolButtons = tools.map((tool) => (
    <Tooltip key={tool.type}>
      <TooltipTrigger asChild>
        <Button
          variant={currentTool === tool.type ? 'default' : 'outline'}
          size="icon"
          className="h-7 w-7"
          onClick={() => setTool(tool.type)}
        >
          {tool.icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tool.label} ({tool.shortcut})</TooltipContent>
    </Tooltip>
  ));

  if (horizontal) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">{undoRedoButtons}</div>
        <div className="w-px h-6 bg-border shrink-0" />
        <div className="flex gap-0.5">{toolButtons}</div>

        {currentTool === 'pencil' && (
          <>
            <div className="w-px h-6 bg-border shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Size: {pencilSize}</span>
              <Slider value={[pencilSize]} onValueChange={([v]) => setPencilSize(v)} min={1} max={10} step={1} className="w-20" />
            </div>
          </>
        )}
        {currentTool === 'eraser' && (
          <>
            <div className="w-px h-6 bg-border shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Eraser: {eraserSize}</span>
              <Slider value={[eraserSize]} onValueChange={([v]) => setEraserSize(v)} min={1} max={10} step={1} className="w-20" />
            </div>
          </>
        )}
        {isShapeTool && (
          <>
            <div className="w-px h-6 bg-border shrink-0" />
            <Select value={shapeMode} onValueChange={(v) => setShapeMode(v as 'outline' | 'filled' | 'both')}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outline">Outline Only</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="both">Outline + Fill</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        {currentTool === 'select' && (
          <>
            <div className="w-px h-6 bg-border shrink-0" />
            <Select value={selectionMode} onValueChange={(v) => setSelectionMode(v as SelectionMode)}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="lasso">Lasso</SelectItem>
              </SelectContent>
            </Select>
            {hasSelection && (
              <div className="flex gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={copySelection}><Copy className="h-3 w-3" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy (Ctrl+C)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={startMove}><Move className="h-3 w-3" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Move selection</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={deleteSelection}><Trash2 className="h-3 w-3" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete (Del)</TooltipContent>
                </Tooltip>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tools
        </Label>
        <div className="flex gap-1">{undoRedoButtons}</div>
      </div>

      {/* Tool buttons */}
      <div className="grid grid-cols-4 gap-1">
        {tools.map((tool) => (
          <Tooltip key={tool.type}>
            <TooltipTrigger asChild>
              <Button
                variant={currentTool === tool.type ? 'default' : 'outline'}
                size="sm"
                className="h-9"
                onClick={() => setTool(tool.type)}
              >
                {tool.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {tool.label} ({tool.shortcut})
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {currentTool !== 'pan' && (
        <p className="text-[10px] text-muted-foreground">
          Hold Ctrl + drag to pan canvas
        </p>
      )}

      {currentTool === 'select' && (
        <div className="space-y-1.5">
          <Label className="text-xs">
            Selection{hasSelection
              ? selectionBoundary!.kind === 'rect'
                ? ` (${selectionBoundary!.maxX - selectionBoundary!.minX + 1}\u00d7${selectionBoundary!.maxY - selectionBoundary!.minY + 1})`
                : ' (lasso)'
              : ''}
          </Label>
          <Select value={selectionMode} onValueChange={(v) => setSelectionMode(v as SelectionMode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rectangle">Rectangle Marquee</SelectItem>
              <SelectItem value="lasso">Freeform Lasso</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mb-1">
            {selectionMode === 'rectangle'
              ? 'Drag to select rectangle. Shift+drag to add.'
              : 'Drag to draw freeform shape. Shift+drag to add.'}
            {' '}Click selected cell to move.
          </p>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" disabled={!hasSelection} onClick={copySelection}>
                  <Copy className="h-3 w-3 mr-1" />Copy
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy selection (Ctrl+C)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" disabled={!hasSelection} onClick={startMove}>
                  <Move className="h-3 w-3 mr-1" />Move
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move selection</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" disabled={!hasSelection} onClick={deleteSelection}>
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selection (Del)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {currentTool === 'pencil' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Pencil Size: {pencilSize}x{pencilSize}</Label>
          <Slider value={[pencilSize]} onValueChange={([v]) => setPencilSize(v)} min={1} max={10} step={1} />
        </div>
      )}

      {currentTool === 'eraser' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Eraser Size: {eraserSize}x{eraserSize}</Label>
          <Slider value={[eraserSize]} onValueChange={([v]) => setEraserSize(v)} min={1} max={10} step={1} />
        </div>
      )}

      {isShapeTool && (
        <div className="space-y-1.5">
          <Label className="text-xs">Shape Fill</Label>
          <Select value={shapeMode} onValueChange={(v) => setShapeMode(v as 'outline' | 'filled' | 'both')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outline">Outline Only</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="both">Outline + Fill</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
