'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToolStore } from '@/stores/toolStore';
import { usePatternStore } from '@/stores/patternStore';
import { usePanelOrientation } from '@/components/toolbar/PanelShell';
import { DMCColor } from '@/types/pattern';
import dmcColors from '@/data/dmcColors.json';

const allColors: DMCColor[] = dmcColors as DMCColor[];

export function ColorPicker() {
  const [search, setSearch] = useState('');
  const currentColor = useToolStore((s) => s.currentColor);
  const setCurrentColor = useToolStore((s) => s.setCurrentColor);
  const pattern = usePatternStore((s) => s.pattern);

  // Colors used across all visible layers (in-bounds stitches only)
  const usedColorCodes = useMemo(() => {
    if (!pattern) return new Set<string>();
    const codes = new Set<string>();
    for (const layer of pattern.layers) {
      if (!layer.visible) continue;
      layer.stitches.forEach((stitch) => {
        if (stitch.x >= 0 && stitch.y >= 0 && stitch.x < pattern.width && stitch.y < pattern.height) {
          codes.add(stitch.dmcCode);
        }
      });
    }
    return codes;
  }, [pattern]);

  // Filter colors by search
  const filteredColors = useMemo(() => {
    if (!search.trim()) return allColors;
    const q = search.toLowerCase();
    return allColors.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    );
  }, [search]);

  // Split into used colors and all colors
  const usedColors = useMemo(
    () => allColors.filter((c) => usedColorCodes.has(c.code)),
    [usedColorCodes]
  );

  const selectedDMC = allColors.find((c) => c.code === currentColor);
  const horizontal = usePanelOrientation();

  if (horizontal) {
    return (
      <div className="flex items-center gap-2">
        {selectedDMC && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-7 w-7 rounded border-2 border-primary shrink-0 cursor-default"
                style={{ backgroundColor: selectedDMC.hex }} />
            </TooltipTrigger>
            <TooltipContent>DMC {selectedDMC.code} — {selectedDMC.name}</TooltipContent>
          </Tooltip>
        )}
        {usedColors.length > 0 && !search && (
          <div className="flex gap-0.5 flex-wrap max-h-7 overflow-hidden">
            {usedColors.map((color) => (
              <Tooltip key={color.code}>
                <TooltipTrigger asChild>
                  <button
                    className={`h-6 w-6 rounded-sm border-2 transition-all ${
                      currentColor === color.code
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-transparent hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={`DMC ${color.code} — ${color.name}`}
                    onClick={() => setCurrentColor(color.code)}
                  />
                </TooltipTrigger>
                <TooltipContent>DMC {color.code} — {color.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        {search && (
          <div className="flex gap-0.5 flex-wrap max-h-7 overflow-hidden">
            {filteredColors.slice(0, 20).map((color) => (
              <Tooltip key={color.code}>
                <TooltipTrigger asChild>
                  <button
                    className={`h-6 w-6 rounded-sm border-2 transition-all ${
                      currentColor === color.code ? 'border-primary ring-1 ring-primary' : 'border-transparent hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={`DMC ${color.code} — ${color.name}`}
                    onClick={() => setCurrentColor(color.code)}
                  />
                </TooltipTrigger>
                <TooltipContent>DMC {color.code} — {color.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        <Input
          placeholder="Search DMC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs w-28 shrink-0"
        />
        {/* Expand button — opens full color grid in a popover above the bar */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0">
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-72 p-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                All DMC Colors
              </Label>
              <Input
                placeholder="Search DMC code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs"
              />
              {usedColors.length > 0 && !search && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Used ({usedColors.length})</Label>
                  <div className="grid grid-cols-8 gap-0.5">
                    {usedColors.map((color) => (
                      <Tooltip key={color.code}>
                        <TooltipTrigger asChild>
                          <button
                            className={`h-5 w-full rounded-sm border transition-all ${
                              currentColor === color.code
                                ? 'border-primary ring-2 ring-primary ring-offset-1'
                                : 'border-border hover:border-primary/50'
                            }`}
                            style={{ backgroundColor: color.hex }}
                            aria-label={`DMC ${color.code} — ${color.name}`}
                            onClick={() => setCurrentColor(color.code)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>DMC {color.code} — {color.name}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto rounded border p-1">
                <div className="grid grid-cols-8 gap-0.5">
                  {filteredColors.map((color) => (
                    <Tooltip key={color.code}>
                      <TooltipTrigger asChild>
                        <button
                          className={`h-5 w-full rounded-sm border transition-all ${
                            currentColor === color.code
                              ? 'border-primary ring-2 ring-primary ring-offset-1'
                              : 'border-transparent hover:border-primary/50'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          aria-label={`DMC ${color.code} — ${color.name}`}
                          onClick={() => setCurrentColor(color.code)}
                        />
                      </TooltipTrigger>
                      <TooltipContent>DMC {color.code} — {color.name}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        DMC Floss Color
      </Label>

      {/* Current color preview */}
      {selectedDMC && (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <div
            className="h-8 w-8 rounded border"
            style={{ backgroundColor: selectedDMC.hex }}
          />
          <div className="text-xs">
            <div className="font-semibold">DMC {selectedDMC.code}</div>
            <div className="text-muted-foreground">{selectedDMC.name}</div>
          </div>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Search DMC code or name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs"
      />

      {/* Used colors section */}
      {usedColors.length > 0 && !search && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Used in Pattern ({usedColors.length})
          </Label>
          <div className="grid grid-cols-6 gap-1">
            {usedColors.map((color) => (
              <Tooltip key={color.code}>
                <TooltipTrigger asChild>
                  <button
                    className={`h-6 w-full rounded-sm border transition-all ${
                      currentColor === color.code
                        ? 'border-primary ring-2 ring-primary ring-offset-1'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={`DMC ${color.code} — ${color.name}`}
                    onClick={() => setCurrentColor(color.code)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  DMC {color.code} - {color.name}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* All colors grid */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {search ? `Results (${filteredColors.length})` : 'All DMC Colors'}
        </Label>
        <div className="max-h-48 overflow-y-auto rounded border p-1">
          <div className="grid grid-cols-8 gap-0.5">
            {filteredColors.map((color) => (
              <Tooltip key={color.code}>
                <TooltipTrigger asChild>
                  <button
                    className={`h-5 w-full rounded-sm border transition-all ${
                      currentColor === color.code
                        ? 'border-primary ring-2 ring-primary ring-offset-1'
                        : 'border-transparent hover:border-primary/50'
                    } ${usedColorCodes.has(color.code) ? 'ring-1 ring-blue-300' : ''}`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={`DMC ${color.code} — ${color.name}`}
                    onClick={() => setCurrentColor(color.code)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  DMC {color.code} - {color.name}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
