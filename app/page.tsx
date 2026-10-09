'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { PanelDock } from '@/components/toolbar/PanelDock';
import { NewPatternDialog } from '@/components/NewPatternDialog';
import { SaveLoadPanel } from '@/components/panels/SaveLoadPanel';
import { ResizePatternDialog } from '@/components/ResizePatternDialog';
import { SyncCodePopover } from '@/components/SyncCodePopover';
import { AIGenerateDialog } from '@/components/AIGenerateDialog';
import { usePatternStore } from '@/stores/patternStore';
import { useToolStore } from '@/stores/toolStore';
import { useUIStore } from '@/stores/uiStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { Plus, PanelLeftClose, PanelLeftOpen, Moon, Sun, FolderOpen, Maximize2, Printer, Wand2 } from 'lucide-react';
import { ToolType } from '@/types/tool';
import { serializePattern } from '@/lib/db/patternDB';
import { ensureSession } from '@/lib/api/session';
import { listPatterns, getPattern, savePattern } from '@/lib/api/patterns';

const StitchCanvas = dynamic(
  () => import('@/components/canvas/StitchCanvas').then((mod) => ({ default: mod.StitchCanvas })),
  { ssr: false }
);

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export default function Home() {
  const pattern = usePatternStore((s) => s.pattern);
  const updatePatternName = usePatternStore((s) => s.updatePatternName);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const panelDocks = useUIStore((s) => s.panelDocks);
  const draggingPanelId = useUIStore((s) => s.draggingPanelId);
  const hasRightPanels = pattern && (Object.values(panelDocks).some((d) => d === 'right') || !!draggingPanelId);
  const hasBottomPanels = pattern && (Object.values(panelDocks).some((d) => d === 'bottom') || !!draggingPanelId);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [bottomHeight, setBottomHeight] = useState(160);
  const bottomResizeRef = useRef<{ startY: number; startH: number } | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const lastSavedAtRef = useRef<number>(0);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');

  // ── Startup: ensure session then load last-opened pattern from API ─────────
  useEffect(() => {
    (async () => {
      try {
        await ensureSession();

        const lastId = localStorage.getItem('lastOpenedPatternId');
        if (lastId) {
          try {
            const p = await getPattern(lastId);
            lastSavedAtRef.current = p.updatedAt.getTime();
            usePatternStore.getState().loadPattern(p);
            return;
          } catch { /* pattern not found or backend down — fall through */ }
        }

        // Fall back to most-recently-updated pattern from API
        const list = await listPatterns();
        if (list.length > 0) {
          const p = await getPattern(list[0].id);
          lastSavedAtRef.current = p.updatedAt.getTime();
          usePatternStore.getState().loadPattern(p);
          localStorage.setItem('lastOpenedPatternId', p.id);
        } else {
          setShowNewDialog(true);
        }
      } catch {
        // Backend not reachable — start fresh
        setShowNewDialog(true);
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  // ── Auto-save: debounced 2 s after each pattern change ────────────────────
  useEffect(() => {
    if (!pattern) {
      setSaveStatus('idle');
      return;
    }
    if (pattern.updatedAt.getTime() <= lastSavedAtRef.current) {
      setSaveStatus('saved');
      return;
    }
    setSaveStatus('unsaved');
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await savePattern(pattern);
        localStorage.setItem('lastOpenedPatternId', pattern.id);
        lastSavedAtRef.current = pattern.updatedAt.getTime();
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [pattern]);

  // ── Dark mode ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Pattern name editing ──────────────────────────────────────────────────
  const handleNameSave = useCallback(() => {
    if (editingName.trim() && pattern) {
      updatePatternName(editingName.trim());
    }
    setIsEditingName(false);
  }, [editingName, pattern, updatePatternName]);

  const handlePatternLoad = useCallback((updatedAt: Date) => {
    lastSavedAtRef.current = updatedAt.getTime();
    setSaveStatus('saved');
  }, []);

  const handlePrint = useCallback(() => {
    if (!pattern) return;
    sessionStorage.setItem('cross-stitch-print', JSON.stringify(serializePattern(pattern)));
    window.open('/print', '_blank');
  }, [pattern]);

  const handleBottomResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    bottomResizeRef.current = { startY: e.clientY, startH: bottomHeight };
    const onMove = (ev: MouseEvent) => {
      if (!bottomResizeRef.current) return;
      const delta = bottomResizeRef.current.startY - ev.clientY;
      const newH = Math.max(48, Math.min(600, bottomResizeRef.current.startH + delta));
      setBottomHeight(newH);
    };
    const onUp = () => {
      bottomResizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [bottomHeight]);

  // When the user imports a new session token, reload patterns from it
  const handleSessionImported = useCallback(async () => {
    localStorage.removeItem('lastOpenedPatternId');
    setIsInitializing(true);
    try {
      const list = await listPatterns();
      if (list.length > 0) {
        const p = await getPattern(list[0].id);
        lastSavedAtRef.current = p.updatedAt.getTime();
        usePatternStore.getState().loadPattern(p);
        localStorage.setItem('lastOpenedPatternId', p.id);
      } else {
        usePatternStore.getState().loadPattern(null as never);
        setShowNewDialog(true);
      }
    } catch {
      setShowNewDialog(true);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const toolKeys: Record<string, ToolType> = {
      p: 'pencil', e: 'eraser', g: 'fill', r: 'rectangle',
      c: 'circle', l: 'line', h: 'pan', s: 'select',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        usePatternStore.getState().undo();
        useSelectionStore.getState().clearSelection();
        return;
      }
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        usePatternStore.getState().redo();
        useSelectionStore.getState().clearSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const sel = useSelectionStore.getState();
        if (sel.selectionBoundary !== null) { e.preventDefault(); sel.copySelection(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const sel = useSelectionStore.getState();
        if (sel.clipboard.length > 0) {
          e.preventDefault();
          usePatternStore.getState().addLayer('Paste');
          sel.startPlacement(sel.clipboard);
          useToolStore.getState().setTool('select');
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useSelectionStore.getState();
        if (sel.selectionBoundary !== null) { e.preventDefault(); sel.deleteSelection(); }
        return;
      }
      if (e.key === 'Escape') {
        const sel = useSelectionStore.getState();
        if (sel.isMoving) sel.cancelMove(); else sel.clearSelection();
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tool = toolKeys[e.key.toLowerCase()];
        if (tool) { e.preventDefault(); useToolStore.getState().setTool(tool); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <header className="flex h-12 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>

            {pattern && isEditingName ? (
              <Input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="h-7 w-44 text-sm"
              />
            ) : (
              <h1
                className={`text-sm font-semibold ${pattern ? 'cursor-pointer underline-offset-2 hover:underline decoration-muted-foreground' : ''}`}
                onClick={pattern ? () => { setIsEditingName(true); setEditingName(pattern.name); } : undefined}
                title={pattern ? 'Click to rename' : undefined}
              >
                {pattern ? pattern.name : 'Cross-Stitch Designer'}
              </h1>
            )}

            {pattern && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline-offset-2 hover:underline"
                    onClick={() => setShowResizeDialog(true)}
                  >
                    {pattern.width} &times; {pattern.height}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Resize pattern</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-2">
            {saveStatus === 'unsaved' && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            {saveStatus === 'saving'  && <span className="text-xs text-muted-foreground">Saving&hellip;</span>}
            {saveStatus === 'saved'   && <span className="text-xs text-muted-foreground">Saved</span>}
            {saveStatus === 'error'   && <span className="text-xs text-destructive">Save failed</span>}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  aria-label={darkMode ? 'Light mode' : 'Dark mode'}
                  onClick={toggleDarkMode}>
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{darkMode ? 'Light mode' : 'Dark mode'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowAIDialog(true)}>
                  <Wand2 className="mr-1 h-3.5 w-3.5" />
                  AI Generate
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate a pattern with AI</TooltipContent>
            </Tooltip>

            <SyncCodePopover onSessionImported={handleSessionImported} />

            {pattern && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setShowResizeDialog(true)}>
                    <Maximize2 className="mr-1 h-3.5 w-3.5" />
                    Resize
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Scale pattern to new size</TooltipContent>
              </Tooltip>
            )}

            {pattern && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="mr-1 h-3.5 w-3.5" />
                    Print
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open printable pattern sheet</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowOpenDialog(true)}>
                  <FolderOpen className="mr-1 h-3.5 w-3.5" />
                  Open
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open saved pattern</TooltipContent>
            </Tooltip>

            <Button variant="outline" size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {sidebarOpen && pattern && (
              <aside className="w-64 shrink-0 overflow-y-auto border-r bg-background">
                <Toolbar />
              </aside>
            )}

            {isInitializing ? (
              <div className="flex flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <p className="text-sm text-muted-foreground">Loading&hellip;</p>
              </div>
            ) : pattern ? (
              <StitchCanvas />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2">Welcome to Cross-Stitch Designer</h2>
                  <p className="text-sm text-muted-foreground mb-4">Create a new pattern to get started</p>
                  <Button onClick={() => setShowNewDialog(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    New Pattern
                  </Button>
                </div>
              </div>
            )}

            {hasRightPanels && (
              <aside className="w-64 shrink-0 overflow-y-auto border-l bg-background">
                <PanelDock dock="right" direction="vertical" />
              </aside>
            )}
          </div>

          {hasBottomPanels && (
            <div className="shrink-0 border-t bg-background flex flex-col" style={{ height: bottomHeight }}>
              <div
                className="h-1.5 w-full shrink-0 cursor-row-resize group flex items-center justify-center hover:bg-primary/20 transition-colors"
                onMouseDown={handleBottomResizeStart}
              >
                <div className="w-8 h-0.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
              <div className="flex-1 overflow-auto">
                <PanelDock dock="bottom" direction="horizontal" />
              </div>
            </div>
          )}
        </div>
      </div>

      <AIGenerateDialog open={showAIDialog} onOpenChange={setShowAIDialog} />
      <NewPatternDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
      <ResizePatternDialog open={showResizeDialog} onOpenChange={setShowResizeDialog} />
      <SaveLoadPanel
        open={showOpenDialog}
        onOpenChange={setShowOpenDialog}
        onPatternLoad={handlePatternLoad}
      />
    </TooltipProvider>
  );
}
