'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AIDA_FABRICS, DEFAULT_FABRIC } from '@/data/aidaFabrics';
import { usePatternStore } from '@/stores/patternStore';

interface NewPatternDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPatternDialog({ open, onOpenChange }: NewPatternDialogProps) {
  const [name, setName] = useState('My Pattern');
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(50);
  const [fabricCount, setFabricCount] = useState(DEFAULT_FABRIC.count);
  const [fabricColor, setFabricColor] = useState(DEFAULT_FABRIC.colors[0].hex);

  const createPattern = usePatternStore((s) => s.createPattern);

  const currentFabric = AIDA_FABRICS.find((f) => f.count === fabricCount) || DEFAULT_FABRIC;

  const handleCreate = () => {
    createPattern(name, width, height, fabricCount, fabricColor);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Pattern</DialogTitle>
          <DialogDescription>
            Set up your cross-stitch pattern dimensions and fabric.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Pattern name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Pattern Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Pattern"
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-1.5">
            <Label>Grid Size (stitches)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
                min={1}
              />
              <span className="text-muted-foreground">x</span>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
                min={1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Finished size: {(width / fabricCount).toFixed(1)}&quot; x {(height / fabricCount).toFixed(1)}&quot;
              ({(width / fabricCount * 2.54).toFixed(1)} cm x {(height / fabricCount * 2.54).toFixed(1)} cm)
            </p>
          </div>

          {/* Fabric count */}
          <div className="space-y-1.5">
            <Label>Aida Count</Label>
            <Select
              value={String(fabricCount)}
              onValueChange={(v) => {
                const count = parseInt(v);
                setFabricCount(count);
                const fabric = AIDA_FABRICS.find((f) => f.count === count);
                if (fabric) setFabricColor(fabric.colors[0].hex);
              }}
            >
              <SelectTrigger>
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
            <Label>Fabric Color</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {currentFabric.colors.map((color) => (
                <Tooltip key={color.hex}>
                  <TooltipTrigger asChild>
                    <button
                      className={`h-8 w-full rounded border-2 transition-all ${
                        fabricColor === color.hex
                          ? 'border-primary ring-2 ring-primary ring-offset-1'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => setFabricColor(color.hex)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{color.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Pattern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
