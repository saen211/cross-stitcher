'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Wand2, Loader2 } from 'lucide-react';
import { usePatternStore } from '@/stores/patternStore';
import { generatePattern } from '@/lib/api/ai';
import { AIDA_FABRICS, DEFAULT_FABRIC } from '@/data/aidaFabrics';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIGenerateDialog({ open, onOpenChange }: Props) {
  const pattern = usePatternStore((s) => s.pattern);
  const createPattern = usePatternStore((s) => s.createPattern);
  const addStitches = usePatternStore((s) => s.addStitches);
  const pushHistory = usePatternStore((s) => s.pushHistory);

  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState(pattern?.width ?? 30);
  const [height, setHeight] = useState(pattern?.height ?? 30);
  const [maxColors, setMaxColors] = useState(10);
  const [fabricCount, setFabricCount] = useState(pattern?.fabricCount ?? DEFAULT_FABRIC.count);
  const [fabricColor, setFabricColor] = useState(pattern?.fabricColor ?? DEFAULT_FABRIC.colors[0].hex);
  const [replaceCanvas, setReplaceCanvas] = useState(!pattern);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Reset form to match current pattern state each time the dialog opens
  useEffect(() => {
    if (open) {
      const p = usePatternStore.getState().pattern;
      setWidth(p?.width ?? 30);
      setHeight(p?.height ?? 30);
      setFabricCount(p?.fabricCount ?? DEFAULT_FABRIC.count);
      setFabricColor(p?.fabricColor ?? DEFAULT_FABRIC.colors[0].hex);
      setReplaceCanvas(!p);
      setError('');
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Enter a prompt to describe your pattern.'); return; }
    setError('');
    setIsGenerating(true);
    try {
      const result = await generatePattern({ prompt: prompt.trim(), width, height, maxColors });

      if (replaceCanvas || !pattern) {
        const patternName = prompt.trim().slice(0, 40) || 'AI Pattern';
        createPattern(patternName, width, height, fabricCount, fabricColor);
        usePatternStore.getState().addStitches(result.stitches);
      } else {
        pushHistory();
        addStitches(result.stitches);
      }
      onOpenChange(false);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Check your API key is configured on the server.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Pattern Generator
          </DialogTitle>
          <DialogDescription>
            Describe your cross-stitch design and AI will generate a pattern for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-prompt">Describe your pattern</Label>
            <Input
              id="ai-prompt"
              placeholder="e.g., a red rose with green leaves, simple butterfly, pixel heart"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
              autoFocus
            />
          </div>

          {/* Size */}
          <div className="space-y-1.5">
            <Label>Grid size (stitches)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(5, Math.min(200, parseInt(e.target.value) || 30)))}
                className="w-24"
                min={5} max={200}
              />
              <span className="text-muted-foreground text-sm">&times;</span>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(5, Math.min(200, parseInt(e.target.value) || 30)))}
                className="w-24"
                min={5} max={200}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Larger grids take longer and use more AI tokens. 30&times;30 is a good starting size.
            </p>
          </div>

          {/* Max colors */}
          <div className="space-y-1.5">
            <Label>Max colors: {maxColors}</Label>
            <Slider
              value={[maxColors]}
              onValueChange={([v]) => setMaxColors(v)}
              min={2} max={24} step={1}
            />
            <p className="text-xs text-muted-foreground">Fewer colors = simpler, faster to stitch.</p>
          </div>

          {/* Placement options */}
          {pattern && (
            <div className="space-y-1.5">
              <Label>Placement</Label>
              <Select value={replaceCanvas ? 'replace' : 'add'} onValueChange={(v) => setReplaceCanvas(v === 'replace')}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add to current canvas as new layer</SelectItem>
                  <SelectItem value="replace">Create new pattern (replaces canvas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fabric settings — only shown when replacing */}
          {(!pattern || replaceCanvas) && (
            <div className="space-y-1.5">
              <Label>Aida count</Label>
              <Select
                value={String(fabricCount)}
                onValueChange={(v) => {
                  const count = parseInt(v);
                  setFabricCount(count);
                  const fabric = AIDA_FABRICS.find((f) => f.count === count);
                  if (fabric) setFabricColor(fabric.colors[0].hex);
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AIDA_FABRICS.map((f) => (
                    <SelectItem key={f.count} value={String(f.count)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Generating&hellip;
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-3.5 w-3.5" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
