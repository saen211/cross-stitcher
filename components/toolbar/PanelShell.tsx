'use client';

import React, { createContext, useContext, useRef } from 'react';
import { ChevronDown, ChevronRight, GripVertical, PanelLeft, PanelRight, PanelBottom } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUIStore, PanelId, PanelDock } from '@/stores/uiStore';

export const PanelOrientationContext = createContext<boolean>(false);
export function usePanelOrientation() { return useContext(PanelOrientationContext); }

interface PanelShellProps {
  id: PanelId;
  title: string;
  children: React.ReactNode;
  onDragStart: (id: PanelId) => void;
  onDragOver: (id: PanelId) => void;
  onDrop: () => void;
}

const DOCK_ICONS: Record<PanelDock, React.ReactNode> = {
  left: <PanelLeft className="h-3 w-3" />,
  right: <PanelRight className="h-3 w-3" />,
  bottom: <PanelBottom className="h-3 w-3" />,
};

const DOCK_LABELS: Record<PanelDock, string> = {
  left: 'Left sidebar',
  right: 'Right sidebar',
  bottom: 'Bottom bar',
};

export function PanelShell({ id, title, children, onDragStart, onDragOver, onDrop }: PanelShellProps) {
  const panelDocks = useUIStore((s) => s.panelDocks);
  const panelCollapsed = useUIStore((s) => s.panelCollapsed);
  const setPanelDock = useUIStore((s) => s.setPanelDock);
  const togglePanelCollapsed = useUIStore((s) => s.togglePanelCollapsed);
  const horizontal = usePanelOrientation();

  const setDraggingPanelId = useUIStore((s) => s.setDraggingPanelId);
  const currentDock = panelDocks[id];
  const collapsed = panelCollapsed[id];

  const dragRef = useRef(false);

  const otherDocks: PanelDock[] = (['left', 'right', 'bottom'] as PanelDock[]).filter(
    (d) => d !== currentDock
  );

  return (
    <div
      className="rounded border border-transparent hover:border-border transition-colors"
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      {/* Panel header */}
      <div className="flex items-center gap-1 py-0.5 px-1 rounded group">
        {/* Drag handle */}
        <div
          draggable
          className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-30 group-hover:opacity-70 hover:opacity-100 transition-opacity shrink-0"
          onDragStart={(e) => {
            dragRef.current = true;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('panel-id', id);
            setDraggingPanelId(id);
            onDragStart(id);
          }}
          onDragEnd={() => {
            dragRef.current = false;
            setDraggingPanelId(null);
          }}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Collapse toggle + title */}
        <button
          className="flex flex-1 items-center gap-1 text-left min-w-0"
          onClick={() => togglePanelCollapsed(id)}
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          }
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
            {title}
          </span>
        </button>

        {/* Dock buttons — shown on hover */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {otherDocks.map((dock) => (
            <Tooltip key={dock}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setPanelDock(id, dock)}
                >
                  {DOCK_ICONS[dock]}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move to {DOCK_LABELS[dock]}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Panel content */}
      {!collapsed && (
        <div className={horizontal ? 'px-1 py-1 flex items-center' : 'px-1 pb-2'}>
          {children}
        </div>
      )}
    </div>
  );
}
