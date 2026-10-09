'use client';

import React, { useRef, useState } from 'react';
import { useUIStore, PanelId, PanelDock as PanelDockType } from '@/stores/uiStore';
import { PanelShell, PanelOrientationContext } from './PanelShell';
import { DrawingTools } from './DrawingTools';
import { ColorPicker } from './ColorPicker';
import { GridControls } from './GridControls';
import { PatternLibrary } from './PatternLibrary';
import { LayerPanel } from '@/components/panels/LayerPanel';
import { AnalysisPanel } from '@/components/panels/AnalysisPanel';

const PANEL_TITLES: Record<PanelId, string> = {
  tools: 'Tools',
  color: 'Color',
  grid: 'Grid',
  layers: 'Layers',
  library: 'Pattern Library',
  analysis: 'Pattern Analysis',
};

function PanelContent({ id }: { id: PanelId }) {
  switch (id) {
    case 'tools': return <DrawingTools />;
    case 'color': return <ColorPicker />;
    case 'grid': return <GridControls />;
    case 'layers': return <LayerPanel />;
    case 'library': return <PatternLibrary />;
    case 'analysis': return <AnalysisPanel />;
  }
}

interface Props {
  dock: PanelDockType;
  direction?: 'vertical' | 'horizontal';
}

export function PanelDock({ dock, direction = 'vertical' }: Props) {
  const panelOrder = useUIStore((s) => s.panelOrder);
  const panelDocks = useUIStore((s) => s.panelDocks);
  const setPanelOrder = useUIStore((s) => s.setPanelOrder);
  const setPanelDock = useUIStore((s) => s.setPanelDock);

  const panels = panelOrder.filter((id) => panelDocks[id] === dock);

  const dragSourceRef = useRef<PanelId | null>(null);
  const [dragOverId, setDragOverId] = useState<PanelId | null>(null);
  const [isDragTarget, setIsDragTarget] = useState(false);

  const handleDragStart = (id: PanelId) => {
    dragSourceRef.current = id;
  };

  const handleDragOver = (id: PanelId) => {
    if (dragSourceRef.current && dragSourceRef.current !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = () => {
    const src = dragSourceRef.current;
    const over = dragOverId;
    if (src && over && src !== over) {
      const newOrder = [...panelOrder];
      const srcIdx = newOrder.indexOf(src);
      const overIdx = newOrder.indexOf(over);
      newOrder.splice(srcIdx, 1);
      newOrder.splice(overIdx, 0, src);
      setPanelOrder(newOrder);
    }
    dragSourceRef.current = null;
    setDragOverId(null);
  };

  const containerClass = direction === 'horizontal'
    ? 'flex flex-row gap-2 overflow-x-auto p-2 min-h-[2.5rem]'
    : 'flex flex-col gap-1 p-2 min-h-[2.5rem]';

  return (
    <PanelOrientationContext.Provider value={direction === 'horizontal'}>
    <div
      className={`${containerClass} transition-colors ${isDragTarget ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset rounded' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragTarget(true);
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the container entirely (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragTarget(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragTarget(false);
        const panelId = e.dataTransfer.getData('panel-id') as PanelId;
        if (!panelId) return;
        if (panelDocks[panelId] !== dock) {
          // Cross-dock: move the panel to this dock
          setPanelDock(panelId, dock);
        } else {
          // Same-dock: reorder
          handleDrop();
        }
        dragSourceRef.current = null;
        setDragOverId(null);
      }}
    >
      {panels.map((id) => (
        <div
          key={id}
          className={`transition-all ${dragOverId === id ? 'ring-2 ring-primary rounded' : ''}`}
        >
          <PanelShell
            id={id}
            title={PANEL_TITLES[id]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <PanelContent id={id} />
          </PanelShell>
        </div>
      ))}
      {/* Drop hint shown when dock is empty */}
      {panels.length === 0 && isDragTarget && (
        <div className="flex-1 flex items-center justify-center py-4 text-xs text-muted-foreground">
          Drop here
        </div>
      )}
    </div>
    </PanelOrientationContext.Provider>
  );
}
