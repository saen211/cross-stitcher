'use client';

import React from 'react';
import { Rect, Group } from 'react-konva';

interface PreviewPoint {
  x: number;
  y: number;
  isOutline: boolean;
}

interface ToolOverlayProps {
  previewPoints: PreviewPoint[];
  cellSize: number;
  outlineColor: string; // hex
  fillColor: string;    // hex
}

export const ToolOverlay = React.memo(function ToolOverlay({
  previewPoints,
  cellSize,
  outlineColor,
  fillColor,
}: ToolOverlayProps) {
  if (previewPoints.length === 0) return null;

  return (
    <Group listening={false}>
      {previewPoints.map((p, i) => (
        <Rect
          key={i}
          x={p.x * cellSize}
          y={p.y * cellSize}
          width={cellSize}
          height={cellSize}
          fill={p.isOutline ? outlineColor : fillColor}
          opacity={0.5}
          listening={false}
        />
      ))}
    </Group>
  );
});
