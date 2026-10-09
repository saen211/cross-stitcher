'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { usePatternStore } from '@/stores/patternStore';
import { useUIStore } from '@/stores/uiStore';
import { usePanelOrientation } from '@/components/toolbar/PanelShell';
import { AIDA_FABRICS, getFabricByCount } from '@/data/aidaFabrics';

export function GridControls() {
  const pattern = usePatternStore((s) => s.pattern);
  const updateFabricCount = usePatternStore((s) => s.updateFabricCount);
  const updateFabricColor = usePatternStore((s) => s.updateFabricColor);
  const updateGridSize = usePatternStore((s) => s.updateGridSize);

  const zoom = useUIStore((s) => s.zoom);
  const showGrid = useUIStore((s) => s.showGrid);
  const viewMode = useUIStore((s) => s.viewMode);
  const zoomIn = useUIStore((s) => s.zoomIn);
  const zoomOut = useUIStore((s) => s.zoomOut);
  const resetZoom = useUIStore((s) => s.resetZoom);
  const setShowGrid = useUIStore((s) => s.setShowGrid);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const horizontal = usePanelOrientation();

  if (!pattern) return null;

  const currentFabric = getFabricByCount(pattern.fabricCount);
  const warnThreshold = parseInt(
    process.env.NEXT_PUBLIC_WARN_SIZE_THRESHOLD || '400'
  );

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      if (val > warnThreshold && pattern.height > warnThreshold) {
        if (!confirm(`A grid of ${val}x${pattern.height} may cause performance issues. Continue?`)) return;
      }
      updateGridSize(val, pattern.height);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      if (pattern.width > warnThreshold && val > warnThreshold) {
        if (!confirm(`A grid of ${pattern.width}x${val} may cause performance issues. Continue?`)) return;
      }
      updateGridSize(pattern.width, val);
    }
  };

  const zoomButtons = (
    <div className="flex gap-0.5 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoomOut}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoomIn}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={resetZoom}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showGrid ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => setShowGrid(!showGrid)}>
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Grid</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={viewMode === 'symbol' ? 'default' : 'outline'} size="icon" className="h-7 w-7"
                onClick={() => setViewMode(viewMode === 'color' ? 'symbol' : 'color')}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{viewMode === 'color' ? 'Symbol View' : 'Color View'}</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground ml-1">{Math.round(zoom * 100)}%</span>
        </div>
  );

  if (horizontal) {
    return (
      <div className="flex items-center gap-2">
        {zoomButtons}
        <div className="w-px h-6 bg-border shrink-0" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Size:</span>
          <Input type="number" value={pattern.width} onChange={handleWidthChange} className="h-7 w-16 text-xs" min={1} />
          <span className="text-xs text-muted-foreground">×</span>
          <Input type="number" value={pattern.height} onChange={handleHeightChange} className="h-7 w-16 text-xs" min={1} />
        </div>
        <div className="w-px h-6 bg-border shrink-0" />
        <Select value={String(pattern.fabricCount)} onValueChange={(v) => updateFabricCount(parseInt(v))}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AIDA_FABRICS.map((fabric) => (
              <SelectItem key={fabric.count} value={String(fabric.count)}>{fabric.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentFabric && currentFabric.colors.length > 0 && (
          <>
            <div className="w-px h-6 bg-border shrink-0" />
            <div className="flex gap-0.5 items-center">
              {currentFabric.colors.map((color) => (
                <Tooltip key={color.hex}>
                  <TooltipTrigger asChild>
                    <button
                      className={`h-6 w-6 rounded border-2 transition-all ${
                        pattern.fabricColor === color.hex
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => updateFabricColor(color.hex)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{color.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Zoom controls */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Zoom: {Math.round(zoom * 100)}%
        </Label>
        {zoomButtons}
      </div>

      {/* Grid size */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Grid Size
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={pattern.width}
            onChange={handleWidthChange}
            className="h-8 w-20 text-xs"
            min={1}
          />
          <span className="text-xs text-muted-foreground">x</span>
          <Input
            type="number"
            value={pattern.height}
            onChange={handleHeightChange}
            className="h-8 w-20 text-xs"
            min={1}
          />
        </div>
      </div>

      {/* Fabric count */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aida Count
        </Label>
        <Select
          value={String(pattern.fabricCount)}
          onValueChange={(v) => updateFabricCount(parseInt(v))}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AIDA_FABRICS.map((fabric) => (
              <SelectItem key={fabric.count} value={String(fabric.count)}>
                {fabric.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fabric color */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fabric Color
        </Label>
        <div className="grid grid-cols-5 gap-1">
          {currentFabric?.colors.map((color) => (
            <Tooltip key={color.hex}>
              <TooltipTrigger asChild>
                <button
                  className={`h-7 w-full rounded border-2 transition-all ${
                    pattern.fabricColor === color.hex
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => updateFabricColor(color.hex)}
                />
              </TooltipTrigger>
              <TooltipContent>{color.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Pattern dimensions info */}
      <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
        <p>
          Finished size:{' '}
          <strong>
            {(pattern.width / pattern.fabricCount).toFixed(1)}&quot; x{' '}
            {(pattern.height / pattern.fabricCount).toFixed(1)}&quot;
          </strong>
        </p>
        <p>
          ({(pattern.width / pattern.fabricCount * 2.54).toFixed(1)} cm x{' '}
          {(pattern.height / pattern.fabricCount * 2.54).toFixed(1)} cm)
        </p>
      </div>
    </div>
  );
}
