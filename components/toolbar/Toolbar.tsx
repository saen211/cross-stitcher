'use client';

import React from 'react';
import { PanelDock } from './PanelDock';
import { usePatternStore } from '@/stores/patternStore';

export function Toolbar() {
  const pattern = usePatternStore((s) => s.pattern);

  if (!pattern) return null;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <PanelDock dock="left" direction="vertical" />
    </div>
  );
}
