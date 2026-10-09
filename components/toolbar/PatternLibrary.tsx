'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Library, Plus, Trash2, Download, Maximize2, Link, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePatternLibraryStore, LibraryEntry } from '@/stores/patternLibraryStore';
import { usePatternStore, getCompositeStitches } from '@/stores/patternStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useToolStore } from '@/stores/toolStore';
import { Stitch } from '@/types/pattern';
import { getCellsInBoundary } from '@/lib/canvas/polygon';
import dmcColors from '@/data/dmcColors.json';

// Build DMC hex lookup for mini preview
const dmcHexMap = new Map<string, string>();
for (const c of dmcColors) {
  dmcHexMap.set(c.code, c.hex);
}

function MiniPreview({ entry }: { entry: LibraryEntry }) {
  const maxDim = 48;
  const scale = Math.min(maxDim / entry.width, maxDim / entry.height, 4);
  const w = Math.ceil(entry.width * scale);
  const h = Math.ceil(entry.height * scale);

  return (
    <div
      className="border rounded bg-white dark:bg-neutral-900 flex-shrink-0"
      style={{ width: maxDim, height: maxDim, position: 'relative', overflow: 'hidden' }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${entry.width} ${entry.height}`}>
        {entry.stitches.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={1}
            height={1}
            fill={dmcHexMap.get(s.dmcCode) || '#888'}
          />
        ))}
      </svg>
    </div>
  );
}

/** Nearest-neighbor scaling of a flat stitch array. */
function scaleStitches(
  stitches: Stitch[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number
): Stitch[] {
  if (newW === oldW && newH === oldH) return stitches;
  const lookup = new Map(stitches.map((s) => [`${s.x},${s.y}`, s]));
  const result: Stitch[] = [];
  for (let ny = 0; ny < newH; ny++) {
    for (let nx = 0; nx < newW; nx++) {
      const ox = oldW <= 1 || newW <= 1 ? 0 : Math.round(nx * (oldW - 1) / (newW - 1));
      const oy = oldH <= 1 || newH <= 1 ? 0 : Math.round(ny * (oldH - 1) / (newH - 1));
      const stitch = lookup.get(`${ox},${oy}`);
      if (stitch) result.push({ ...stitch, x: nx, y: ny });
    }
  }
  return result;
}

interface ResizePlaceDialogProps {
  entry: LibraryEntry | null;
  onClose: () => void;
}

function ResizePlaceDialog({ entry, onClose }: ResizePlaceDialogProps) {
  const addEntry = usePatternLibraryStore((s) => s.addEntry);
  const [newWidth, setNewWidth] = useState(0);
  const [newHeight, setNewHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);

  useEffect(() => {
    if (entry) {
      setNewWidth(entry.width);
      setNewHeight(entry.height);
    }
  }, [entry]);

  const handleWidthChange = useCallback((raw: string) => {
    const val = parseInt(raw);
    if (isNaN(val) || val < 1) return;
    setNewWidth(val);
    if (lockAspect && entry && entry.width > 0) {
      setNewHeight(Math.max(1, Math.round(val * entry.height / entry.width)));
    }
  }, [lockAspect, entry]);

  const handleHeightChange = useCallback((raw: string) => {
    const val = parseInt(raw);
    if (isNaN(val) || val < 1) return;
    setNewHeight(val);
    if (lockAspect && entry && entry.height > 0) {
      setNewWidth(Math.max(1, Math.round(val * entry.width / entry.height)));
    }
  }, [lockAspect, entry]);

  const placeScaled = (stitches: Stitch[]) => {
    const patternStore = usePatternStore.getState();
    if (!patternStore.pattern) return;
    patternStore.addLayer(entry!.name);
    useSelectionStore.getState().startPlacement(stitches);
    useToolStore.getState().setTool('select');
    onClose();
  };

  const handlePlace = () => {
    if (!entry) return;
    const scaled = scaleStitches(entry.stitches, entry.width, entry.height, newWidth, newHeight);
    placeScaled(scaled);
  };

  const handleSaveAndPlace = () => {
    if (!entry) return;
    const scaled = scaleStitches(entry.stitches, entry.width, entry.height, newWidth, newHeight);
    addEntry(`${entry.name} (${newWidth}×${newHeight})`, scaled);
    placeScaled(scaled);
  };

  if (!entry) return null;

  const scaleX = newWidth / entry.width;
  const scaleY = newHeight / entry.height;
  const isSameSize = newWidth === entry.width && newHeight === entry.height;

  // Scaled preview
  const scaledStitches = isSameSize
    ? entry.stitches
    : scaleStitches(entry.stitches, entry.width, entry.height, newWidth, newHeight);
  const previewDim = 80;
  const previewScale = Math.min(previewDim / newWidth, previewDim / newHeight, 4);
  const previewW = Math.ceil(newWidth * previewScale);
  const previewH = Math.ceil(newHeight * previewScale);

  return (
    <Dialog open={entry !== null} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resize &amp; Place: {entry.name}</DialogTitle>
          <DialogDescription>
            Original: {entry.width}&times;{entry.height} &middot; {entry.stitchCount} stitches
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* New size inputs */}
          <div className="space-y-1.5">
            <Label className="text-xs">New size (stitches)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newWidth}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="h-8 w-20 text-xs"
                min={1}
                max={500}
              />
              <span className="text-xs text-muted-foreground">&times;</span>
              <Input
                type="number"
                value={newHeight}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="h-8 w-20 text-xs"
                min={1}
                max={500}
              />
              <Button
                variant={lockAspect ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setLockAspect(!lockAspect)}
                title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              >
                {lockAspect ? <Link className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Scale info + preview */}
          <div className="flex items-start gap-3">
            <div
              className="border rounded bg-white dark:bg-neutral-900 shrink-0 flex items-center justify-center"
              style={{ width: previewDim, height: previewDim }}
            >
              <svg width={previewW} height={previewH} viewBox={`0 0 ${newWidth} ${newHeight}`}>
                {scaledStitches.map((s, i) => (
                  <rect key={i} x={s.x} y={s.y} width={1} height={1}
                    fill={dmcHexMap.get(s.dmcCode) || '#888'} />
                ))}
              </svg>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Scale:{' '}
                <span className={scaleX !== scaleY ? 'text-amber-500 dark:text-amber-400' : ''}>
                  {scaleX.toFixed(2)}&times; &times; {scaleY.toFixed(2)}&times;
                </span>
              </p>
              {scaleX !== scaleY && (
                <p className="text-amber-500 dark:text-amber-400">Non-uniform — will stretch</p>
              )}
              {(scaleX < 1 || scaleY < 1) && (
                <p>Shrinking may lose detail.</p>
              )}
              <p>{scaledStitches.length} stitches</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveAndPlace} disabled={newWidth < 1 || newHeight < 1}>
            Save &amp; Place
          </Button>
          <Button size="sm" onClick={handlePlace} disabled={newWidth < 1 || newHeight < 1}>
            Place
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PatternLibrary() {
  const entries = usePatternLibraryStore((s) => s.entries);
  const addEntry = usePatternLibraryStore((s) => s.addEntry);
  const removeEntry = usePatternLibraryStore((s) => s.removeEntry);

  const selectionBoundary = useSelectionStore((s) => s.selectionBoundary);
  const hasSelection = selectionBoundary !== null;

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [resizeEntry, setResizeEntry] = useState<LibraryEntry | null>(null);

  const handleSaveToLibrary = () => {
    const pattern = usePatternStore.getState().pattern;
    if (!pattern || !selectionBoundary) return;

    // Save from the composite (what the user sees) so all visible layers are captured
    const composite = getCompositeStitches(pattern);
    const cells = getCellsInBoundary(selectionBoundary, pattern.width, pattern.height);
    const stitches: Stitch[] = [];
    for (const cell of cells) {
      const stitch = composite.get(`${cell.x},${cell.y}`);
      if (stitch) stitches.push({ ...stitch });
    }

    if (stitches.length === 0) return;

    addEntry(saveName || 'Untitled', stitches);
    setSaveDialogOpen(false);
    setSaveName('');
  };

  const handlePlaceOnCanvas = (entry: LibraryEntry) => {
    const patternStore = usePatternStore.getState();
    const pattern = patternStore.pattern;
    if (!pattern) return;

    const stitchesToPlace: Stitch[] = entry.stitches.filter(
      (s) => s.x < pattern.width && s.y < pattern.height
    );
    if (stitchesToPlace.length === 0) return;

    // Create a dedicated layer named after the library entry so it stays isolated.
    // commitMove will write the stitches to this new active layer.
    patternStore.addLayer(entry.name);

    const selState = useSelectionStore.getState();
    selState.startPlacement(stitchesToPlace);
    useToolStore.getState().setTool('select');
  };

  const handleDelete = (id: string) => {
    removeEntry(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Library className="h-3 w-3" />
          Pattern Library
        </Label>
        <span className="text-[10px] text-muted-foreground">{entries.length} saved</span>
      </div>

      {/* Save button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            disabled={!hasSelection}
            onClick={() => {
              setSaveName('');
              setSaveDialogOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Save Selection to Library
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hasSelection
            ? 'Save the selected stitches as a reusable pattern'
            : 'Select stitches first to save to library'}
        </TooltipContent>
      </Tooltip>

      {/* Library entries */}
      {entries.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          No patterns saved yet. Select stitches and save them here to reuse across designs.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 p-1.5 rounded border bg-card hover:bg-accent/50 transition-colors"
            >
              <MiniPreview entry={entry} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{entry.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {entry.width}x{entry.height} &middot; {entry.stitchCount} stitches &middot; {entry.colorCount} colors
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handlePlaceOnCanvas(entry)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Place on canvas</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setResizeEntry(entry)}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Resize &amp; place</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteId(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove from library</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save to Pattern Library</DialogTitle>
            <DialogDescription>
              Give this pattern a name. It will be available across all your designs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Pattern Name</Label>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g., Rose Border, Heart, Corner Motif"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveToLibrary();
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {selectionBoundary
                ? selectionBoundary.kind === 'rect'
                  ? `${selectionBoundary.maxX - selectionBoundary.minX + 1}\u00d7${selectionBoundary.maxY - selectionBoundary.minY + 1} area selected`
                  : 'Lasso area selected'
                : 'No selection'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveToLibrary}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resize & Place Dialog */}
      <ResizePlaceDialog entry={resizeEntry} onClose={() => setResizeEntry(null)} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Pattern</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this pattern from your library? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
