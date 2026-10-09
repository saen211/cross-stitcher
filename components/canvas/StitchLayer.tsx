'use client';

import React, { useMemo } from 'react';
import { Rect, Text, Group } from 'react-konva';
import { Stitch } from '@/types/pattern';
import dmcColors from '@/data/dmcColors.json';
import { buildSymbolMap } from '@/lib/canvas/patternAnalysis';

interface StitchLayerProps {
  stitches: Map<string, Stitch>;
  cellSize: number;
  viewMode: 'color' | 'symbol';
}

// Build a lookup map for DMC color hex values
const dmcColorMap = new Map<string, string>();
for (const color of dmcColors) {
  dmcColorMap.set(color.code, color.hex);
}

/** Returns '#ffffff' or '#000000' — whichever contrasts better against the given hex bg. */
function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance (ITU-R BT.601)
  return r * 0.299 + g * 0.587 + b * 0.114 < 128 ? '#ffffff' : '#000000';
}

export const StitchLayer = React.memo(function StitchLayer({
  stitches,
  cellSize,
  viewMode,
}: StitchLayerProps) {
  // Build deterministic symbol map (frequency-ordered, matches the legend panel)
  const colorSymbolMap = useMemo(() => buildSymbolMap(stitches), [stitches]);

  const stitchElements: React.ReactElement[] = [];

  stitches.forEach((stitch, key) => {
    const hex = dmcColorMap.get(stitch.dmcCode) || '#FF00FF';

    if (viewMode === 'color') {
      stitchElements.push(
        <Rect
          key={key}
          x={stitch.x * cellSize}
          y={stitch.y * cellSize}
          width={cellSize}
          height={cellSize}
          fill={hex}
          listening={false}
        />
      );
    } else {
      // Symbol mode: color background with auto-contrasting symbol
      const symbol = colorSymbolMap.get(stitch.dmcCode) || '?';
      const symbolColor = contrastColor(hex);
      stitchElements.push(
        <Group key={key} listening={false}>
          <Rect
            x={stitch.x * cellSize}
            y={stitch.y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={hex}
            listening={false}
          />
          <Text
            x={stitch.x * cellSize}
            y={stitch.y * cellSize}
            width={cellSize}
            height={cellSize}
            text={symbol}
            fontSize={cellSize * 0.65}
            fontFamily="Arial"
            fill={symbolColor}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      );
    }
  });

  return <Group>{stitchElements}</Group>;
});
