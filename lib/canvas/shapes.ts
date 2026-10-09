import { Stitch } from '@/types/pattern';

interface ShapeOptions {
  shapeMode: 'outline' | 'filled' | 'both';
  outlineColor: string;  // DMC code
  fillColor: string;     // DMC code
  width: number;         // grid bounds
  height: number;        // grid bounds
}

/**
 * Clamp a coordinate to grid bounds.
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Bresenham's line algorithm.
 * Returns all grid cells along the line from (x0,y0) to (x1,y1).
 */
export function getLinePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  gridWidth: number,
  gridHeight: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  let cx = x0;
  let cy = y0;

  while (true) {
    if (cx >= 0 && cx < gridWidth && cy >= 0 && cy < gridHeight) {
      points.push({ x: cx, y: cy });
    }

    if (cx === x1 && cy === y1) break;

    const e2 = 2 * err;
    if (e2 >= dy) {
      if (cx === x1) break;
      err += dy;
      cx += sx;
    }
    if (e2 <= dx) {
      if (cy === y1) break;
      err += dx;
      cy += sy;
    }
  }

  return points;
}

/**
 * Generate stitches for a line shape.
 */
export function drawLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  gridWidth: number,
  gridHeight: number
): Stitch[] {
  return getLinePoints(x0, y0, x1, y1, gridWidth, gridHeight).map((p) => ({
    x: p.x,
    y: p.y,
    dmcCode: color,
  }));
}

/**
 * Generate stitches for a rectangle.
 * Supports outline, filled, and both modes.
 */
export function drawRectangle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  options: ShapeOptions
): Stitch[] {
  const minX = clamp(Math.min(x0, x1), 0, options.width - 1);
  const maxX = clamp(Math.max(x0, x1), 0, options.width - 1);
  const minY = clamp(Math.min(y0, y1), 0, options.height - 1);
  const maxY = clamp(Math.max(y0, y1), 0, options.height - 1);

  const stitches: Stitch[] = [];
  const indexMap = new Map<string, number>();

  const addStitch = (x: number, y: number, dmcCode: string) => {
    const key = `${x},${y}`;
    const existing = indexMap.get(key);
    if (existing !== undefined) {
      // Overwrite color (outline overwrites fill in 'both' mode)
      stitches[existing] = { x, y, dmcCode };
    } else {
      indexMap.set(key, stitches.length);
      stitches.push({ x, y, dmcCode });
    }
  };

  // Fill interior
  if (options.shapeMode === 'filled' || options.shapeMode === 'both') {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        addStitch(x, y, options.fillColor);
      }
    }
  }

  // Outline (drawn second so it overwrites fill at edges in 'both' mode)
  if (options.shapeMode === 'outline' || options.shapeMode === 'both') {
    const color = options.outlineColor;
    // Top & bottom edges
    for (let x = minX; x <= maxX; x++) {
      addStitch(x, minY, color);
      addStitch(x, maxY, color);
    }
    // Left & right edges
    for (let y = minY; y <= maxY; y++) {
      addStitch(minX, y, color);
      addStitch(maxX, y, color);
    }
  }

  return stitches;
}

/**
 * Midpoint circle algorithm.
 * Returns the outline points of a circle/ellipse inscribed in the bounding box.
 */
function getEllipseOutlinePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  gridWidth: number,
  gridHeight: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const pointSet = new Set<string>();

  const addPoint = (x: number, y: number) => {
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      const key = `${x},${y}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        points.push({ x, y });
      }
    }
  };

  if (rx === 0 && ry === 0) {
    addPoint(cx, cy);
    return points;
  }

  // Use parametric approach for accurate ellipse
  // Use enough steps to ensure no gaps in the outline
  const steps = Math.max(Math.max(rx, ry) * 16, 64);
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const px = Math.round(cx + rx * Math.cos(angle));
    const py = Math.round(cy + ry * Math.sin(angle));
    addPoint(px, py);
  }

  return points;
}

/**
 * Get all interior points of an ellipse.
 */
function getEllipseFillPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  gridWidth: number,
  gridHeight: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  const startY = clamp(Math.round(cy - ry), 0, gridHeight - 1);
  const endY = clamp(Math.round(cy + ry), 0, gridHeight - 1);

  for (let y = startY; y <= endY; y++) {
    // For each row, find the horizontal extent using the ellipse equation
    const dy = y - cy;
    if (ry === 0) continue;
    const xSpan = rx * Math.sqrt(1 - (dy * dy) / (ry * ry));
    const startX = clamp(Math.round(cx - xSpan), 0, gridWidth - 1);
    const endX = clamp(Math.round(cx + xSpan), 0, gridWidth - 1);

    for (let x = startX; x <= endX; x++) {
      points.push({ x, y });
    }
  }

  return points;
}

/**
 * Generate stitches for a circle/ellipse inscribed in bounding box.
 * Supports outline, filled, and both modes.
 */
export function drawCircle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  options: ShapeOptions
): Stitch[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;

  const stitches: Stitch[] = [];
  const indexMap = new Map<string, number>();

  const addStitch = (x: number, y: number, dmcCode: string) => {
    const key = `${x},${y}`;
    const existing = indexMap.get(key);
    if (existing !== undefined) {
      stitches[existing] = { x, y, dmcCode };
    } else {
      indexMap.set(key, stitches.length);
      stitches.push({ x, y, dmcCode });
    }
  };

  // Fill interior
  if (options.shapeMode === 'filled' || options.shapeMode === 'both') {
    const fillPoints = getEllipseFillPoints(cx, cy, rx, ry, options.width, options.height);
    for (const p of fillPoints) {
      addStitch(p.x, p.y, options.fillColor);
    }
  }

  // Outline (drawn second so it overwrites fill at edges in 'both' mode)
  if (options.shapeMode === 'outline' || options.shapeMode === 'both') {
    const outlinePoints = getEllipseOutlinePoints(cx, cy, rx, ry, options.width, options.height);
    for (const p of outlinePoints) {
      addStitch(p.x, p.y, options.outlineColor);
    }
  }

  return stitches;
}

/**
 * Get preview points for any shape (used for overlay rendering).
 * Returns coords without creating Stitch objects for performance.
 */
export function getShapePreviewPoints(
  tool: 'rectangle' | 'circle' | 'line',
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  shapeMode: 'outline' | 'filled' | 'both',
  gridWidth: number,
  gridHeight: number
): Array<{ x: number; y: number; isOutline: boolean }> {
  const points: Array<{ x: number; y: number; isOutline: boolean }> = [];
  const indexMap = new Map<string, number>();

  const addPoint = (x: number, y: number, isOutline: boolean) => {
    const key = `${x},${y}`;
    const existing = indexMap.get(key);
    if (existing !== undefined) {
      // Outline overwrites fill at edge positions
      points[existing] = { x, y, isOutline };
    } else {
      indexMap.set(key, points.length);
      points.push({ x, y, isOutline });
    }
  };

  if (tool === 'line') {
    const linePoints = getLinePoints(x0, y0, x1, y1, gridWidth, gridHeight);
    for (const p of linePoints) {
      addPoint(p.x, p.y, true);
    }
    return points;
  }

  const minX = clamp(Math.min(x0, x1), 0, gridWidth - 1);
  const maxX = clamp(Math.max(x0, x1), 0, gridWidth - 1);
  const minY = clamp(Math.min(y0, y1), 0, gridHeight - 1);
  const maxY = clamp(Math.max(y0, y1), 0, gridHeight - 1);

  if (tool === 'rectangle') {
    if (shapeMode === 'filled' || shapeMode === 'both') {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          addPoint(x, y, false);
        }
      }
    }
    if (shapeMode === 'outline' || shapeMode === 'both') {
      for (let x = minX; x <= maxX; x++) {
        addPoint(x, minY, true);
        addPoint(x, maxY, true);
      }
      for (let y = minY; y <= maxY; y++) {
        addPoint(minX, y, true);
        addPoint(maxX, y, true);
      }
    }
  }

  if (tool === 'circle') {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;

    if (shapeMode === 'filled' || shapeMode === 'both') {
      const fillPoints = getEllipseFillPoints(cx, cy, rx, ry, gridWidth, gridHeight);
      for (const p of fillPoints) {
        addPoint(p.x, p.y, false);
      }
    }
    if (shapeMode === 'outline' || shapeMode === 'both') {
      const outlinePoints = getEllipseOutlinePoints(cx, cy, rx, ry, gridWidth, gridHeight);
      for (const p of outlinePoints) {
        addPoint(p.x, p.y, true);
      }
    }
  }

  return points;
}
