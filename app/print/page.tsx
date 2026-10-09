'use client';

import React, { useEffect, useState } from 'react';
import { Pattern, Stitch } from '@/types/pattern';
import { deserializePattern } from '@/lib/db/patternDB';
import { analyzePattern, buildSymbolMap } from '@/lib/canvas/patternAnalysis';
import type { PatternAnalysis } from '@/lib/canvas/patternAnalysis';

// ── Layout constants ──────────────────────────────────────────────────────────
const CELL_W = 9;    // SVG units per stitch column
const CELL_H = 6;    // SVG units per stitch row
const RULER_W = 28;  // Left ruler width in SVG units
const RULER_H = 18;  // Top ruler height in SVG units
const SECTION_COLS = 50;
const SECTION_ROWS = 100;

const SVG_W = RULER_W + SECTION_COLS * CELL_W; // 478
const SVG_H = RULER_H + SECTION_ROWS * CELL_H; // 618

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}

function getComposite(pattern: Pattern): Map<string, Stitch> {
  const composite = new Map<string, Stitch>();
  for (let i = pattern.layers.length - 1; i >= 0; i--) {
    const layer = pattern.layers[i];
    if (!layer.visible) continue;
    layer.stitches.forEach((s, k) => composite.set(k, s));
  }
  return composite;
}

// ── Section SVG ───────────────────────────────────────────────────────────────

interface SectionProps {
  colOffset: number;
  rowOffset: number;
  composite: Map<string, Stitch>;
  symbolMap: Map<string, string>;
  colorMap: Map<string, string>; // dmcCode → hex
  totalCols: number;
  totalRows: number;
  centerCol: number; // global center column (may or may not fall in this section)
  centerRow: number; // global center row
  sectionIndex: number;
  totalSections: number;
  patternName: string;
}

function PatternSection({
  colOffset,
  rowOffset,
  composite,
  symbolMap,
  colorMap,
  totalCols,
  totalRows,
  centerCol,
  centerRow,
  sectionIndex,
  totalSections,
  patternName,
}: SectionProps) {
  const colEnd = Math.min(colOffset + SECTION_COLS, totalCols);
  const rowEnd = Math.min(rowOffset + SECTION_ROWS, totalRows);
  const localCols = colEnd - colOffset;
  const localRows = rowEnd - rowOffset;
  const svgW = RULER_W + localCols * CELL_W;
  const svgH = RULER_H + localRows * CELL_H;

  // Collect cells for this section
  const cells: Array<{ lx: number; ly: number; hex: string; symbol: string }> = [];
  for (let ly = 0; ly < localRows; ly++) {
    for (let lx = 0; lx < localCols; lx++) {
      const gx = colOffset + lx;
      const gy = rowOffset + ly;
      const stitch = composite.get(`${gx},${gy}`);
      if (stitch) {
        cells.push({
          lx,
          ly,
          hex: colorMap.get(stitch.dmcCode) ?? '#888888',
          symbol: symbolMap.get(stitch.dmcCode) ?? '?',
        });
      }
    }
  }

  // Ruler ticks every 10 stitches
  const colTicks: number[] = [];
  for (let i = 0; i < localCols; i += 10) colTicks.push(i);
  const rowTicks: number[] = [];
  for (let i = 0; i < localRows; i += 10) rowTicks.push(i);

  return (
    <div className="print-page" style={{ pageBreakAfter: 'always' }}>
      {/* Page header (outside SVG) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, fontSize: 9 }}>
        <span style={{ fontWeight: 600 }}>{patternName}</span>
        <span style={{ color: '#666' }}>
          Cols {colOffset}–{colEnd - 1} &middot; Rows {rowOffset}–{rowEnd - 1} &middot; Page {sectionIndex + 1} of {totalSections}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ display: 'block', maxWidth: '100%', border: '1px solid #ccc' }}
      >
        {/* Fabric background */}
        <rect x={RULER_W} y={RULER_H} width={localCols * CELL_W} height={localRows * CELL_H} fill="#f9f5f0" />

        {/* Grid lines */}
        {Array.from({ length: localCols + 1 }, (_, i) => (
          <line
            key={`vc${i}`}
            x1={RULER_W + i * CELL_W} y1={RULER_H}
            x2={RULER_W + i * CELL_W} y2={RULER_H + localRows * CELL_H}
            stroke={(colOffset + i) % 10 === 0 ? '#aaa' : '#ddd'}
            strokeWidth={(colOffset + i) % 10 === 0 ? 0.5 : 0.3}
          />
        ))}
        {Array.from({ length: localRows + 1 }, (_, i) => (
          <line
            key={`hr${i}`}
            x1={RULER_W} y1={RULER_H + i * CELL_H}
            x2={RULER_W + localCols * CELL_W} y2={RULER_H + i * CELL_H}
            stroke={(rowOffset + i) % 10 === 0 ? '#aaa' : '#ddd'}
            strokeWidth={(rowOffset + i) % 10 === 0 ? 0.5 : 0.3}
          />
        ))}

        {/* Stitch cells */}
        {cells.map(({ lx, ly, hex, symbol }) => {
          const dark = isDark(hex);
          const cx = RULER_W + lx * CELL_W;
          const cy = RULER_H + ly * CELL_H;
          return (
            <g key={`${lx},${ly}`}>
              <rect x={cx} y={cy} width={CELL_W} height={CELL_H} fill={hex} />
              <text
                x={cx + CELL_W / 2}
                y={cy + CELL_H / 2 + 1.5}
                textAnchor="middle"
                fontSize={CELL_H * 0.75}
                fontFamily="Arial"
                fill={dark ? '#fff' : '#000'}
              >
                {symbol}
              </text>
            </g>
          );
        })}

        {/* Top ruler */}
        <rect x={RULER_W} y={0} width={localCols * CELL_W} height={RULER_H} fill="#f0f0f0" />
        <line x1={RULER_W} y1={RULER_H} x2={RULER_W + localCols * CELL_W} y2={RULER_H} stroke="#999" strokeWidth={0.5} />
        {colTicks.map((i) => {
          const x = RULER_W + i * CELL_W;
          const label = colOffset + i;
          return (
            <g key={`ct${i}`}>
              <line x1={x} y1={RULER_H - 4} x2={x} y2={RULER_H} stroke="#666" strokeWidth={0.5} />
              <text x={x + 1} y={RULER_H - 5} fontSize={5} fontFamily="Arial" fill="#444">{label}</text>
            </g>
          );
        })}
        {/* Center-column arrow on top ruler (points down into grid) */}
        {centerCol >= colOffset && centerCol < colOffset + localCols && (() => {
          const ax = RULER_W + (centerCol - colOffset) * CELL_W + CELL_W / 2;
          return (
            <g key="center-col-arrow">
              <polygon points={`${ax - 4},2 ${ax + 4},2 ${ax},${RULER_H - 1}`} stroke="#7f7f7f" fillOpacity={0} strokeWidth={0.5} />
            </g>
          );
        })()}

        {/* Left ruler */}
        <rect x={0} y={RULER_H} width={RULER_W} height={localRows * CELL_H} fill="#f0f0f0" />
        <line x1={RULER_W} y1={RULER_H} x2={RULER_W} y2={RULER_H + localRows * CELL_H} stroke="#999" strokeWidth={0.5} />
        {rowTicks.map((i) => {
          const y = RULER_H + i * CELL_H;
          const label = rowOffset + i;
          return (
            <g key={`rt${i}`}>
              <line x1={RULER_W - 4} y1={y} x2={RULER_W} y2={y} stroke="#666" strokeWidth={0.5} />
              <text x={2} y={y + 4} fontSize={5} fontFamily="Arial" fill="#444">{label}</text>
            </g>
          );
        })}
        {/* Center-row arrow on left ruler (points right into grid) */}
        {centerRow >= rowOffset && centerRow < rowOffset + localRows && (() => {
          const ay = RULER_H + (centerRow - rowOffset) * CELL_H + CELL_H / 2;
          return (
            <g key="center-row-arrow">
              <polygon points={`2,${ay - 4} 2,${ay + 4} ${RULER_W - 1},${ay}`} stroke="#7f7f7f" fillOpacity={0} strokeWidth={0.5} />
            </g>
          );
        })()}

        {/* Corner */}
        <rect x={0} y={0} width={RULER_W} height={RULER_H} fill="#e8e8e8" />
      </svg>
    </div>
  );
}

// ── Overview page (full design, fit to one page) ─────────────────────────────

const OV_CELL = 6; // SVG units per cell in the overview

interface OverviewProps {
  pattern: Pattern;
  composite: Map<string, Stitch>;
  colorMap: Map<string, string>;
  analysis: PatternAnalysis;
}

function OverviewPage({ pattern, composite, colorMap, analysis }: OverviewProps) {
  const w = pattern.width;
  const h = pattern.height;
  const svgW = w * OV_CELL;
  const svgH = h * OV_CELL;

  // Build cell rects
  const cellRects: React.ReactElement[] = [];
  composite.forEach((stitch, key) => {
    const hex = colorMap.get(stitch.dmcCode) ?? '#888888';
    cellRects.push(
      <rect
        key={key}
        x={stitch.x * OV_CELL}
        y={stitch.y * OV_CELL}
        width={OV_CELL}
        height={OV_CELL}
        fill={hex}
      />
    );
  });

  // 10-stitch grid lines
  const vLines: React.ReactElement[] = [];
  const hLines: React.ReactElement[] = [];
  for (let i = 0; i <= w; i += 10) {
    vLines.push(
      <line key={`v${i}`} x1={i * OV_CELL} y1={0} x2={i * OV_CELL} y2={svgH}
        stroke="#777" strokeWidth={0.4} opacity={0.4} />
    );
  }
  for (let i = 0; i <= h; i += 10) {
    hLines.push(
      <line key={`h${i}`} x1={0} y1={i * OV_CELL} x2={svgW} y2={i * OV_CELL}
        stroke="#777" strokeWidth={0.4} opacity={0.4} />
    );
  }

  return (
    <div className="print-page" style={{ pageBreakAfter: 'always' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, fontSize: 9, fontFamily: 'Arial, sans-serif' }}>
        <span style={{ fontWeight: 700 }}>{pattern.name} — Full Design Overview</span>
        <span style={{ color: '#555' }}>
          {w} × {h} stitches &bull; {analysis.finishedInchW.toFixed(1)}&quot; &times; {analysis.finishedInchH.toFixed(1)}&quot;
        </span>
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ display: 'block', border: '1px solid #bbb' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Fabric background */}
        <rect x={0} y={0} width={svgW} height={svgH} fill="#f9f5f0" />
        {/* Stitches */}
        {cellRects}
        {/* 10-stitch grid */}
        {vLines}
        {hLines}
      </svg>
    </div>
  );
}

// ── Legend page ───────────────────────────────────────────────────────────────

function LegendPage({ analysis, patternName }: { analysis: PatternAnalysis; patternName: string }) {
  return (
    <div className="print-page" style={{ pageBreakAfter: 'always', padding: 8, fontFamily: 'Arial, sans-serif', fontSize: 10 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{patternName} — Legend</h2>
      <p style={{ color: '#555', marginBottom: 8, fontSize: 9 }}>
        {analysis.width} × {analysis.height} stitches &bull; {analysis.strands} strands &bull; {analysis.fabricCount}-count Aida &bull;{' '}
        {analysis.totalStitches.toLocaleString()} total stitches &bull; {analysis.colorCount} colors
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc', backgroundColor: '#f0f0f0' }}>
            <th style={{ padding: '3px 4px', textAlign: 'left', width: 20 }}>#</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', width: 18 }}>Symbol</th>
            <th style={{ padding: '3px 4px', textAlign: 'left', width: 50 }}>DMC</th>
            <th style={{ padding: '3px 4px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '3px 4px', textAlign: 'right', width: 55 }}>Stitches</th>
            <th style={{ padding: '3px 4px', textAlign: 'right', width: 35 }}>%</th>
            <th style={{ padding: '3px 4px', textAlign: 'right', width: 60 }}>Skeins (rec.)</th>
          </tr>
        </thead>
        <tbody>
          {analysis.colors.map((c, idx) => {
            const dark = isDark(c.hex);
            const skeinLabel = c.skeins.min === c.skeins.max
              ? `${c.skeins.min}`
              : `${c.skeins.min}–${c.skeins.max}`;
            return (
              <tr key={c.dmcCode} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '2px 4px', color: '#888' }}>{idx + 1}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    backgroundColor: c.hex,
                    color: dark ? '#fff' : '#000',
                    fontSize: 9,
                    lineHeight: '14px',
                    textAlign: 'center',
                    border: '1px solid #ccc',
                    borderRadius: 2,
                    fontWeight: 700,
                  }}>
                    {c.symbol}
                  </span>
                </td>
                <td style={{ padding: '2px 4px', fontFamily: 'monospace', fontWeight: 600 }}>{c.dmcCode}</td>
                <td style={{ padding: '2px 4px' }}>{c.name}</td>
                <td style={{ padding: '2px 4px', textAlign: 'right' }}>{c.stitchCount.toLocaleString()}</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', color: '#666' }}>{c.percentage.toFixed(1)}%</td>
                <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                  <span style={{ color: '#555' }}>{skeinLabel}</span>
                  {' '}
                  <span style={{ fontWeight: 700 }}>({c.skeins.recommended})</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #999', backgroundColor: '#f8f8f8' }}>
            <td colSpan={4} style={{ padding: '3px 4px', fontWeight: 700 }}>Total</td>
            <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>{analysis.totalStitches.toLocaleString()}</td>
            <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>100%</td>
            <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>
              {analysis.totalSkeinsMin === analysis.totalSkeinsMax
                ? analysis.totalSkeinsMin
                : `${analysis.totalSkeinsMin}–${analysis.totalSkeinsMax}`}{' '}
              ({analysis.totalSkeinsRecommended})
            </td>
          </tr>
        </tfoot>
      </table>

      <p style={{ marginTop: 10, fontSize: 8, color: '#777' }}>
        Skein estimates based on 8m DMC skeins. Recommended qty = conservative + 1 safety skein per color.
        Finished size: {analysis.finishedInchW.toFixed(1)}&quot; &times; {analysis.finishedInchH.toFixed(1)}&quot;
        ({analysis.finishedCmW.toFixed(1)} &times; {analysis.finishedCmH.toFixed(1)} cm) on {analysis.fabricCount}-count Aida.
      </p>
    </div>
  );
}

// ── Main print page ───────────────────────────────────────────────────────────

export default function PrintPage() {
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cross-stitch-print');
      if (!raw) {
        setError('No pattern data found. Open the print view from the designer.');
        return;
      }
      const parsed = JSON.parse(raw);
      setPattern(deserializePattern(parsed));
    } catch {
      setError('Failed to load pattern data.');
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32, fontFamily: 'Arial', color: '#c00' }}>
        <h2>Print Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div style={{ padding: 32, fontFamily: 'Arial', color: '#666' }}>
        <p>Loading pattern&hellip;</p>
      </div>
    );
  }

  const composite = getComposite(pattern);
  const symbolMap = buildSymbolMap(composite);
  const analysis = analyzePattern(pattern);

  // Build hex lookup from analysis colors
  const colorMap = new Map<string, string>();
  analysis.colors.forEach((c) => colorMap.set(c.dmcCode, c.hex));

  // Design center (in stitch coordinates)
  const centerCol = Math.floor(pattern.width / 2);
  const centerRow = Math.floor(pattern.height / 2);

  // Compute sections
  const sections: Array<{ colOffset: number; rowOffset: number }> = [];
  for (let row = 0; row < pattern.height; row += SECTION_ROWS) {
    for (let col = 0; col < pattern.width; col += SECTION_COLS) {
      sections.push({ colOffset: col, rowOffset: row });
    }
  }

  return (
    <>
      <style>{`
        @page { size: letter portrait; margin: 0.4in; }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .print-page { margin-bottom: 0.3in; }
        @media print {
          .no-print { display: none !important; }
          .print-page { page-break-after: always; margin-bottom: 0; }
        }
      `}</style>

      {/* Print controls — hidden when printing */}
      <div className="no-print" style={{ padding: '12px 16px', borderBottom: '1px solid #ddd', display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'Arial', fontSize: 13 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '6px 16px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
        >
          Print / Save PDF
        </button>
        <span style={{ color: '#666' }}>
          {pattern.name} &mdash; {sections.length} page{sections.length !== 1 ? 's' : ''} + legend
        </span>
      </div>

      <div style={{ padding: '12px 16px', fontFamily: 'Arial' }}>
        {/* Page 1: full design overview with center marker */}
        <OverviewPage
          pattern={pattern}
          composite={composite}
          colorMap={colorMap}
          analysis={analysis}
        />

        {sections.map((sec, idx) => (
          <PatternSection
            key={`${sec.colOffset},${sec.rowOffset}`}
            colOffset={sec.colOffset}
            rowOffset={sec.rowOffset}
            composite={composite}
            symbolMap={symbolMap}
            colorMap={colorMap}
            totalCols={pattern.width}
            totalRows={pattern.height}
            centerCol={centerCol}
            centerRow={centerRow}
            sectionIndex={idx}
            totalSections={sections.length}
            patternName={pattern.name}
          />
        ))}
        <LegendPage analysis={analysis} patternName={pattern.name} />
      </div>
    </>
  );
}
