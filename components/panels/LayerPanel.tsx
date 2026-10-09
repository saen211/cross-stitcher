'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { usePatternStore } from '@/stores/patternStore';
import { usePanelOrientation } from '@/components/toolbar/PanelShell';

export function LayerPanel() {
  const pattern = usePatternStore((s) => s.pattern);
  const addLayer = usePatternStore((s) => s.addLayer);
  const deleteLayer = usePatternStore((s) => s.deleteLayer);
  const setActiveLayer = usePatternStore((s) => s.setActiveLayer);
  const moveLayerUp = usePatternStore((s) => s.moveLayerUp);
  const moveLayerDown = usePatternStore((s) => s.moveLayerDown);
  const toggleLayerVisibility = usePatternStore((s) => s.toggleLayerVisibility);
  const renameLayer = usePatternStore((s) => s.renameLayer);
  const flattenLayers = usePatternStore((s) => s.flattenLayers);
  const flattenSelectedLayers = usePatternStore((s) => s.flattenSelectedLayers);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const horizontal = usePanelOrientation();

  if (!pattern) return null;

  const { layers, activeLayerId } = pattern;

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Remove checked IDs that no longer exist (e.g. after deletion)
  const validCheckedIds = new Set([...checkedIds].filter((id) => layers.some((l) => l.id === id)));

  const startEditing = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(name);
  };

  const commitEdit = () => {
    if (editingId && editingName.trim()) {
      renameLayer(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const handleFlattenSelected = () => {
    const ids = [...validCheckedIds];
    flattenSelectedLayers(ids);
    setCheckedIds(new Set());
  };

  if (horizontal) {
    return (
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => addLayer()}>
              <Plus className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add layer</TooltipContent>
        </Tooltip>
        <div className="flex gap-1 overflow-x-auto">
          {layers.map((layer) => (
            <button
              key={layer.id}
              className={`flex items-center gap-1 h-6 px-2 rounded text-xs whitespace-nowrap border transition-colors ${
                layer.id === activeLayerId
                  ? 'bg-primary/10 border-primary/40 text-foreground'
                  : 'border-border hover:bg-accent text-muted-foreground'
              }`}
              onClick={() => setActiveLayer(layer.id)}
            >
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                className="opacity-70 hover:opacity-100"
              >
                {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </span>
              {layer.name}
              <span className="text-[9px] opacity-50">{layer.stitches.size}</span>
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-border shrink-0" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs shrink-0 px-2"
              disabled={layers.length <= 1} onClick={flattenLayers}>
              Flatten All
            </Button>
          </TooltipTrigger>
          <TooltipContent>Merge all layers</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Layers className="h-3 w-3" />
          Layers
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Add new layer" onClick={() => addLayer()}>
              <Plus className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add new layer</TooltipContent>
        </Tooltip>
      </div>

      {/* Layer list — top of list = visually on top (index 0) */}
      <ul className="space-y-0.5 max-h-52 overflow-y-auto">
        {layers.map((layer, index) => (
          <li
            key={layer.id}
            className={`flex items-center gap-0.5 rounded px-1 py-1 cursor-pointer select-none transition-colors ${
              layer.id === activeLayerId
                ? 'bg-primary/10 ring-1 ring-primary/30'
                : 'hover:bg-accent'
            }`}
            onClick={() => setActiveLayer(layer.id)}
          >
            {/* Flatten checkbox */}
            <input
              type="checkbox"
              checked={validCheckedIds.has(layer.id)}
              onChange={() => {}}
              onClick={(e) => toggleCheck(layer.id, e)}
              className="h-3 w-3 shrink-0 cursor-pointer accent-primary"
              title="Select for flatten"
            />

            {/* Visibility */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  aria-label={layer.visible ? `Hide layer ${layer.name}` : `Show layer ${layer.name}`}
                  onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                >
                  {layer.visible
                    ? <Eye className="h-3 w-3" />
                    : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{layer.visible ? 'Hide layer' : 'Show layer'}</TooltipContent>
            </Tooltip>

            {/* Name — double-click to rename */}
            {editingId === layer.id ? (
              <Input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingId(null);
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-5 flex-1 min-w-0 text-xs px-1 py-0"
              />
            ) : (
              <span
                className="flex-1 min-w-0 text-xs truncate"
                onDoubleClick={(e) => startEditing(layer.id, layer.name, e)}
                title="Double-click to rename"
              >
                {layer.name}
              </span>
            )}

            {/* Stitch count */}
            <span className="text-[10px] text-muted-foreground shrink-0 w-6 text-right">
              {layer.stitches.size}
            </span>

            {/* Move up */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  disabled={index === 0}
                  aria-label={`Move layer ${layer.name} up`}
                  onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move layer up</TooltipContent>
            </Tooltip>

            {/* Move down */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  disabled={index === layers.length - 1}
                  aria-label={`Move layer ${layer.name} down`}
                  onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move layer down</TooltipContent>
            </Tooltip>

            {/* Delete */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
                  disabled={layers.length <= 1}
                  aria-label={`Delete layer ${layer.name}`}
                  onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete layer</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>

      {/* Flatten actions */}
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1 text-xs"
              disabled={validCheckedIds.size < 2}
              onClick={handleFlattenSelected}
            >
              Flatten Selected ({validCheckedIds.size})
            </Button>
          </TooltipTrigger>
          <TooltipContent>Merge checked layers into one</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1 text-xs"
              disabled={layers.length <= 1}
              onClick={flattenLayers}
            >
              Flatten All
            </Button>
          </TooltipTrigger>
          <TooltipContent>Merge all visible layers into one</TooltipContent>
        </Tooltip>
      </div>

      {layers.length === 1 && (
        <p className="text-[10px] text-muted-foreground text-center leading-tight">
          Add a layer to work non-destructively.
          <br />Flatten when done to combine.
        </p>
      )}
    </div>
  );
}
