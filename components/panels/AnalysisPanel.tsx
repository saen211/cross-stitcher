'use client';

import React, { useMemo, useState } from 'react';
import { usePatternStore } from '@/stores/patternStore';
import { analyzePattern, ColorStat } from '@/lib/canvas/patternAnalysis';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePanelOrientation } from '@/components/toolbar/PanelShell';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md bg-muted px-2 py-1.5 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ColorRow({ stat, rank }: { stat: ColorStat; rank: number }) {
  const isDark =
    parseInt(stat.hex.slice(1, 3), 16) * 0.299 +
    parseInt(stat.hex.slice(3, 5), 16) * 0.587 +
    parseInt(stat.hex.slice(5, 7), 16) * 0.114 < 128;

  const skeinLabel =
    stat.skeins.min === stat.skeins.max
      ? `${stat.skeins.min}`
      : `${stat.skeins.min}–${stat.skeins.max}`;

  return (
    <div className="flex items-center gap-1.5 py-1 border-b border-border/50 last:border-0 text-[11px]">
      {/* Rank */}
      <span className="w-4 text-right text-muted-foreground shrink-0">{rank}</span>

      {/* Color swatch with symbol */}
      <div
        className="h-5 w-5 rounded shrink-0 flex items-center justify-center text-[10px] font-bold border border-border/30"
        style={{ backgroundColor: stat.hex, color: isDark ? '#fff' : '#000' }}
      >
        {stat.symbol}
      </div>

      {/* DMC code + name */}
      <div className="flex-1 min-w-0">
        <span className="font-mono font-medium">{stat.dmcCode}</span>
        <span className="text-muted-foreground ml-1 truncate block text-[10px]">{stat.name}</span>
      </div>

      {/* Stitch count + bar */}
      <div className="text-right shrink-0 w-14">
        <span className="font-medium">{stat.stitchCount.toLocaleString()}</span>
        <div className="h-1 mt-0.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60"
            style={{ width: `${Math.max(2, stat.percentage)}%` }}
          />
        </div>
        <span className="text-muted-foreground text-[9px]">{stat.percentage.toFixed(1)}%</span>
      </div>

      {/* Skein estimate */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-right shrink-0 w-10 cursor-help">
            <span className="font-medium text-primary">{skeinLabel}</span>
            <p className="text-[9px] text-muted-foreground">skein{stat.skeins.max !== 1 ? 's' : ''}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs max-w-48">
          <p className="font-medium mb-1">Skein estimate ({stat.skeins.strands} strands)</p>
          <p>Optimistic: {stat.skeins.min}</p>
          <p>Conservative: {stat.skeins.max}</p>
          <p className="text-primary font-medium">Recommended: {stat.skeins.recommended}</p>
          <p className="text-muted-foreground mt-1 text-[10px]">
            Based on {stat.stitchCount.toLocaleString()} stitches × 8m DMC skein
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function AnalysisPanel() {
  const pattern = usePatternStore((s) => s.pattern);
  const [search, setSearch] = useState('');
  const horizontal = usePanelOrientation();

  const analysis = useMemo(
    () => (pattern ? analyzePattern(pattern) : null),
    [pattern]
  );

  if (!analysis) return null;

  if (horizontal) {
    const skeinLabel = analysis.totalSkeinsMin === analysis.totalSkeinsMax
      ? `${analysis.totalSkeinsMin}`
      : `${analysis.totalSkeinsMin}–${analysis.totalSkeinsMax}`;
    return (
      <div className="flex items-center gap-4 text-xs">
        <span><span className="text-muted-foreground">Stitches: </span><strong>{analysis.totalStitches.toLocaleString()}</strong></span>
        <span><span className="text-muted-foreground">Colors: </span><strong>{analysis.colorCount}</strong></span>
        <span><span className="text-muted-foreground">Size: </span><strong>{analysis.finishedInchW.toFixed(1)}&quot;×{analysis.finishedInchH.toFixed(1)}&quot;</strong></span>
        <span><span className="text-muted-foreground">Skeins: </span><strong>{skeinLabel}</strong><span className="text-muted-foreground ml-1">(rec. {analysis.totalSkeinsRecommended})</span></span>
        <span className="text-muted-foreground">{analysis.width}×{analysis.height} · {analysis.strands}str · {analysis.fabricCount}ct</span>
      </div>
    );
  }

  const filtered = search.trim()
    ? analysis.colors.filter(
        (c) =>
          c.dmcCode.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase())
      )
    : analysis.colors;

  const totalSkeinLabel =
    analysis.totalSkeinsMin === analysis.totalSkeinsMax
      ? `${analysis.totalSkeinsMin}`
      : `${analysis.totalSkeinsMin}–${analysis.totalSkeinsMax}`;

  return (
    <div className="space-y-2">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-1">
        <StatCard label="Total Stitches" value={analysis.totalStitches.toLocaleString()} />
        <StatCard label="Colors" value={String(analysis.colorCount)} />
        <StatCard
          label="Finished Size"
          value={`${analysis.finishedInchW.toFixed(1)}" × ${analysis.finishedInchH.toFixed(1)}"`}
          sub={`${analysis.finishedCmW.toFixed(1)} × ${analysis.finishedCmH.toFixed(1)} cm`}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="rounded-md bg-muted px-2 py-1.5 text-center cursor-help">
              <p className="text-[10px] text-muted-foreground">Est. Skeins</p>
              <p className="text-xs font-semibold text-primary">{totalSkeinLabel}</p>
              <p className="text-[9px] text-muted-foreground">
                rec. {analysis.totalSkeinsRecommended}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs max-w-52">
            <p className="font-medium mb-1">Total skein estimate</p>
            <p>Assumes {analysis.strands}-strand work on {analysis.fabricCount}-count Aida.</p>
            <p className="mt-1">Optimistic: {analysis.totalSkeinsMin} total</p>
            <p>Conservative: {analysis.totalSkeinsMax} total</p>
            <p className="text-primary font-medium">Recommended: {analysis.totalSkeinsRecommended} total</p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              Each color is purchased separately. Recommended = conservative + 1 safety skein per color.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        {analysis.width} × {analysis.height} stitches &middot; {analysis.strands} strands &middot; {analysis.fabricCount}-count Aida
      </p>

      {/* Color legend */}
      {analysis.colorCount > 0 && (
        <>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter colors…"
              className="h-7 pl-6 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium uppercase tracking-wide pb-0.5 border-b">
            <span className="w-4 text-right">#</span>
            <span className="w-5 shrink-0" />
            <span className="flex-1">DMC / Name</span>
            <span className="w-14 text-right">Count</span>
            <span className="w-10 text-right">Skeins</span>
          </div>

          <div className="max-h-64 overflow-y-auto -mx-1 px-1">
            {filtered.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-2 text-center">No matches</p>
            ) : (
              filtered.map((stat) => (
                <ColorRow
                  key={stat.dmcCode}
                  stat={stat}
                  rank={analysis.colors.indexOf(stat) + 1}
                />
              ))
            )}
          </div>

          <p className="text-[9px] text-muted-foreground text-center pt-1 border-t">
            Skein estimates use 8m DMC skeins. Buy recommended qty to account for waste &amp; mistakes.
          </p>
        </>
      )}

      {analysis.colorCount === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          No stitches on the canvas yet.
        </p>
      )}
    </div>
  );
}
