'use client';

import React from 'react';
import { Rect, Line, Group } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  cellSize: number;
  fabricColor: string;
  showGrid: boolean;
}

export const GridLayer = React.memo(function GridLayer({
  width,
  height,
  cellSize,
  fabricColor,
  showGrid,
}: GridLayerProps) {
  const totalWidth = width * cellSize;
  const totalHeight = height * cellSize;

  // Generate grid lines
  const gridLines: React.ReactElement[] = [];

  if (showGrid) {
    // Vertical lines
    for (let i = 0; i <= width; i++) {
      const isMajor = i % 10 === 0;
      gridLines.push(
        <Line
          key={`v-${i}`}
          points={[i * cellSize, 0, i * cellSize, totalHeight]}
          stroke={isMajor ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)'}
          strokeWidth={isMajor ? 1 : 0.5}
          listening={false}
        />
      );
    }

    // Horizontal lines
    for (let j = 0; j <= height; j++) {
      const isMajor = j % 10 === 0;
      gridLines.push(
        <Line
          key={`h-${j}`}
          points={[0, j * cellSize, totalWidth, j * cellSize]}
          stroke={isMajor ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)'}
          strokeWidth={isMajor ? 1 : 0.5}
          listening={false}
        />
      );
    }
  }

  return (
    <Group>
      {/* Fabric background */}
      <Rect
        x={0}
        y={0}
        width={totalWidth}
        height={totalHeight}
        fill={fabricColor}
        listening={false}
      />
      {/* Grid lines */}
      {gridLines}
      {/* Border */}
      <Rect
        x={0}
        y={0}
        width={totalWidth}
        height={totalHeight}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={1.5}
        listening={false}
      />
    </Group>
  );
});
