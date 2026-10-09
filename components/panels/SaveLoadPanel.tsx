'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { listPatterns, getPattern, deletePattern, PatternSummary } from '@/lib/api/patterns';
import { usePatternStore } from '@/stores/patternStore';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatternLoad?: (updatedAt: Date) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function SaveLoadPanel({ open, onOpenChange, onPatternLoad }: Props) {
  const [patterns, setPatterns] = useState<PatternSummary[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadPattern = usePatternStore((s) => s.loadPattern);
  const currentId = usePatternStore((s) => s.pattern?.id);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setPatterns(await listPatterns());
    } catch {
      // Backend not available yet — show empty list silently
      setPatterns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
      setConfirmDeleteId(null);
    }
  }, [open, refresh]);

  const handleLoad = async (summary: PatternSummary) => {
    setLoadingId(summary.id);
    try {
      const pattern = await getPattern(summary.id);
      onPatternLoad?.(pattern.updatedAt);
      loadPattern(pattern);
      onOpenChange(false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      try {
        await deletePattern(id);
      } catch { /* ignore */ }
      setConfirmDeleteId(null);
      await refresh();
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Saved Patterns</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading&hellip;</p>
        ) : patterns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No saved patterns yet. Create one with the New button.
          </p>
        ) : (
          <ul className="max-h-[400px] space-y-1 overflow-y-auto pr-1">
            {patterns.map((p) => (
              <li
                key={p.id}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent ${
                  p.id === currentId ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => handleLoad(p)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.updatedAt)}
                    {loadingId === p.id && ' · Loading…'}
                  </p>
                </div>
                <Button
                  variant={confirmDeleteId === p.id ? 'destructive' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title={confirmDeleteId === p.id ? 'Click again to confirm delete' : 'Delete pattern'}
                  onClick={(e) => handleDeleteClick(p.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
