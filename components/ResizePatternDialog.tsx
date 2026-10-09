'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Unlink } from 'lucide-react';
import { usePatternStore } from '@/stores/patternStore';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResizePatternDialog({ open, onOpenChange }: Props) {
  const pattern = usePatternStore((s) => s.pattern);
  const resizePattern = usePatternStore((s) => s.resizePattern);

  const [newWidth, setNewWidth] = useState(0);
  const [newHeight, setNewHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);

  // Reset inputs when dialog opens
  useEffect(() => {
    if (open && pattern) {
      setNewWidth(pattern.width);
      setNewHeight(pattern.height);
    }
  }, [open, pattern]);

  const handleWidthChange = useCallback(
    (raw: string) => {
      const val = parseInt(raw);
      if (isNaN(val) || val < 1) return;
      setNewWidth(val);
      if (lockAspect && pattern && pattern.width > 0) {
        setNewHeight(Math.max(1, Math.round(val * pattern.height / pattern.width)));
      }
    },
    [lockAspect, pattern]
  );

  const handleHeightChange = useCallback(
    (raw: string) => {
      const val = parseInt(raw);
      if (isNaN(val) || val < 1) return;
      setNewHeight(val);
      if (lockAspect && pattern && pattern.height > 0) {
        setNewWidth(Math.max(1, Math.round(val * pattern.width / pattern.height)));
      }
    },
    [lockAspect, pattern]
  );

  const handleConfirm = () => {
    if (newWidth > 0 && newHeight > 0) {
      resizePattern(newWidth, newHeight);
      onOpenChange(false);
    }
  };

  if (!pattern) return null;

  const scaleX = newWidth / pattern.width;
  const scaleY = newHeight / pattern.height;
  const newInchW = (newWidth / pattern.fabricCount).toFixed(1);
  const newInchH = (newHeight / pattern.fabricCount).toFixed(1);
  const newCmW = (newWidth / pattern.fabricCount * 2.54).toFixed(1);
  const newCmH = (newHeight / pattern.fabricCount * 2.54).toFixed(1);
  const isSameSize = newWidth === pattern.width && newHeight === pattern.height;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resize Pattern</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current size */}
          <p className="text-xs text-muted-foreground">
            Current size: <strong>{pattern.width} &times; {pattern.height}</strong> stitches
          </p>

          {/* New size inputs */}
          <div className="space-y-2">
            <Label className="text-xs">New size (stitches)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newWidth}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="h-8 w-24 text-xs"
                min={1}
                max={2000}
              />
              <span className="text-xs text-muted-foreground">&times;</span>
              <Input
                type="number"
                value={newHeight}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="h-8 w-24 text-xs"
                min={1}
                max={2000}
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

          {/* Scale preview */}
          {!isSameSize && (
            <div className="rounded-md bg-muted p-3 space-y-1 text-xs text-muted-foreground">
              <p>
                Scale:{' '}
                <strong className={scaleX === scaleY ? '' : 'text-amber-500 dark:text-amber-400'}>
                  {scaleX.toFixed(2)}&times; wide, {scaleY.toFixed(2)}&times; tall
                </strong>
                {scaleX !== scaleY && (
                  <span className="ml-1">(non-uniform — design will stretch)</span>
                )}
              </p>
              <p>
                New finished size:{' '}
                <strong>
                  {newInchW}&quot; &times; {newInchH}&quot;
                </strong>{' '}
                ({newCmW} &times; {newCmH} cm)
              </p>
              {(scaleX < 1 || scaleY < 1) && (
                <p className="text-amber-600 dark:text-amber-400">
                  Shrinking will lose some detail.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSameSize || newWidth < 1 || newHeight < 1}>
            Resize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
