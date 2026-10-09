import dmcColors from '@/data/dmcColors.json';
import { PATTERN_SYMBOLS } from '@/data/symbols';
import { Pattern, Stitch } from '@/types/pattern';

const dmcNameMap = new Map<string, string>();
const dmcHexMap = new Map<string, string>();
for (const c of dmcColors) {
  dmcNameMap.set(c.code, c.name);
  dmcHexMap.set(c.code, c.hex);
}

// ── Skein estimation ─────────────────────────────────────────────────────────

const DMC_SKEIN_CM = 800; // 8 m per standard DMC skein

/**
 * Recommended strand count for each Aida count.
 * 28-count is stitched over 2 fabric threads (effective cell = 14-count cell).
 */
const STRANDS_BY_COUNT: Record<number, number> = {
  6: 6,
  11: 3,
  14: 2,
  16: 2,
  18: 2,
  22: 1,
  28: 2,
};

/**
 * For 28-count "over 2", each stitch cell is physically the same size as 14-count.
 * Returns the effective count used to compute cell dimensions.
 */
function effectiveCount(fabricCount: number): number {
  return fabricCount === 28 ? 14 : fabricCount;
}

export interface SkeinEstimate {
  /** Optimistic (experienced stitcher, minimal waste) */
  min: number;
  /** Conservative (beginner, normal waste) */
  max: number;
  /** Recommended purchase quantity — conservative + 1 safety skein */
  recommended: number;
  strands: number;
}

/**
 * Estimates skeins needed for a given stitch count and fabric.
 *
 * Formula:
 *   cellCm        = 2.54 / effectiveCount
 *   threadPerStitch = 2 × cellCm × √2 × strands × overheadFactor
 *   stitchesPerSkein = DMC_SKEIN_CM / threadPerStitch
 *   skeins = stitchCount / stitchesPerSkein
 *
 * Overhead factor accounts for needle travel on the back of the fabric,
 * starting/finishing tails, and general waste:
 *   2.0 = optimistic (tight, experienced)
 *   3.0 = conservative (typical beginner with normal waste)
 */
export function estimateSkeins(stitchCount: number, fabricCount: number): SkeinEstimate {
  const strands = STRANDS_BY_COUNT[fabricCount] ?? 2;
  const ec = effectiveCount(fabricCount);
  const cellCm = 2.54 / ec;
  const diagonalCm = cellCm * Math.SQRT2;
  const baseThread = 2 * diagonalCm * strands; // cm per stitch, no overhead

  const stitchesPerSkeinOptimistic  = DMC_SKEIN_CM / (baseThread * 2.0);
  const stitchesPerSkeinConservative = DMC_SKEIN_CM / (baseThread * 3.0);

  const rawMin = stitchCount / stitchesPerSkeinOptimistic;
  const rawMax = stitchCount / stitchesPerSkeinConservative;

  const min = Math.max(1, Math.ceil(rawMin));
  const max = Math.max(1, Math.ceil(rawMax));
  const recommended = max + 1; // one safety skein

  return { min, max, recommended, strands };
}

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface ColorStat {
  dmcCode: string;
  name: string;
  hex: string;
  symbol: string;
  stitchCount: number;
  percentage: number;
  skeins: SkeinEstimate;
}

export interface PatternAnalysis {
  totalStitches: number;
  colorCount: number;
  colors: ColorStat[];
  finishedInchW: number;
  finishedInchH: number;
  finishedCmW: number;
  finishedCmH: number;
  width: number;
  height: number;
  fabricCount: number;
  strands: number;
  totalSkeinsMin: number;
  totalSkeinsMax: number;
  totalSkeinsRecommended: number;
}

// ── Core utilities ────────────────────────────────────────────────────────────

/**
 * Builds a deterministic DMC-code → symbol map from a composite stitch map.
 * Colors sorted by usage count desc, tie-broken by DMC code string order.
 */
export function buildSymbolMap(stitches: Map<string, Stitch>): Map<string, string> {
  const counts = new Map<string, number>();
  stitches.forEach((s) => {
    counts.set(s.dmcCode, (counts.get(s.dmcCode) ?? 0) + 1);
  });

  const sorted = Array.from(counts.entries()).sort((a, b) =>
    b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])
  );

  const map = new Map<string, string>();
  sorted.forEach(([code], idx) => {
    map.set(code, PATTERN_SYMBOLS[idx % PATTERN_SYMBOLS.length]);
  });
  return map;
}

/**
 * Full pattern analysis: composites visible layers, computes per-color stats
 * including skein estimates, and aggregates totals.
 */
export function analyzePattern(pattern: Pattern): PatternAnalysis {
  const composite = new Map<string, Stitch>();
  for (let i = pattern.layers.length - 1; i >= 0; i--) {
    const layer = pattern.layers[i];
    if (!layer.visible) continue;
    layer.stitches.forEach((stitch, key) => {
      if (
        stitch.x >= 0 && stitch.y >= 0 &&
        stitch.x < pattern.width && stitch.y < pattern.height
      ) {
        composite.set(key, stitch);
      }
    });
  }

  const symbolMap = buildSymbolMap(composite);

  const counts = new Map<string, number>();
  composite.forEach((s) => {
    counts.set(s.dmcCode, (counts.get(s.dmcCode) ?? 0) + 1);
  });

  const totalStitches = composite.size;
  const strands = STRANDS_BY_COUNT[pattern.fabricCount] ?? 2;

  const colors: ColorStat[] = Array.from(counts.entries())
    .sort((a, b) => b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0]))
    .map(([code, count]) => ({
      dmcCode: code,
      name: dmcNameMap.get(code) ?? code,
      hex: dmcHexMap.get(code) ?? '#888888',
      symbol: symbolMap.get(code) ?? '?',
      stitchCount: count,
      percentage: totalStitches > 0 ? (count / totalStitches) * 100 : 0,
      skeins: estimateSkeins(count, pattern.fabricCount),
    }));

  const inchW = pattern.width / pattern.fabricCount;
  const inchH = pattern.height / pattern.fabricCount;

  // Total skeins = sum of per-color recommended (each color is a separate purchase)
  const totalSkeinsMin = colors.reduce((s, c) => s + c.skeins.min, 0);
  const totalSkeinsMax = colors.reduce((s, c) => s + c.skeins.max, 0);
  const totalSkeinsRecommended = colors.reduce((s, c) => s + c.skeins.recommended, 0);

  return {
    totalStitches,
    colorCount: colors.length,
    colors,
    finishedInchW: inchW,
    finishedInchH: inchH,
    finishedCmW: inchW * 2.54,
    finishedCmH: inchH * 2.54,
    width: pattern.width,
    height: pattern.height,
    fabricCount: pattern.fabricCount,
    strands,
    totalSkeinsMin,
    totalSkeinsMax,
    totalSkeinsRecommended,
  };
}
