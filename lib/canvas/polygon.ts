// Polygon geometry utilities for selection tools

export type SelectionBoundary =
  | { kind: 'rect'; minX: number; maxX: number; minY: number; maxY: number }
  | { kind: 'lasso'; polygon: Array<{ x: number; y: number }> };

/**
 * Perpendicular distance from point (px,py) to the line defined by (ax,ay)→(bx,by).
 * Used by Ramer-Douglas-Peucker path simplification.
 */
function perpendicularDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Ramer-Douglas-Peucker path simplification.
 * Removes points that deviate less than `eps` from the simplified line.
 */
export function simplifyPath(
  pts: Array<{ x: number; y: number }>,
  eps: number
): Array<{ x: number; y: number }> {
  if (pts.length <= 2) return pts;
  let maxDist = 0, maxIdx = 0;
  const last = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDistance(pts[i].x, pts[i].y, pts[0].x, pts[0].y, last.x, last.y);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > eps) {
    const left = simplifyPath(pts.slice(0, maxIdx + 1), eps);
    const right = simplifyPath(pts.slice(maxIdx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [pts[0], last];
}

/**
 * Ray-casting point-in-polygon test.
 * px/py should be cell center coordinates (e.g. x + 0.5, y + 0.5).
 */
export function pointInPolygon(
  px: number,
  py: number,
  polygon: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Scanline fill algorithm: returns all grid cells inside a closed polygon.
 * O(H × N + filled_cells) complexity.
 */
export function scanlineFill(
  polygon: Array<{ x: number; y: number }>,
  gridWidth: number,
  gridHeight: number
): Array<{ x: number; y: number }> {
  if (polygon.length < 3) return [];

  const poly = simplifyPath(polygon, 0.5);
  if (poly.length < 3) return [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const gridMinX = Math.max(0, Math.floor(minX));
  const gridMinY = Math.max(0, Math.floor(minY));
  const gridMaxX = Math.min(gridWidth - 1, Math.ceil(maxX));
  const gridMaxY = Math.min(gridHeight - 1, Math.ceil(maxY));

  const cells: Array<{ x: number; y: number }> = [];
  const n = poly.length;

  for (let row = gridMinY; row <= gridMaxY; row++) {
    const scanY = row + 0.5;
    const xs: number[] = [];

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = poly[i].y, yj = poly[j].y;
      if ((yi <= scanY && yj > scanY) || (yj <= scanY && yi > scanY)) {
        const t = (scanY - yi) / (yj - yi);
        xs.push(poly[i].x + t * (poly[j].x - poly[i].x));
      }
    }

    xs.sort((a, b) => a - b);

    for (let k = 0; k + 1 < xs.length; k += 2) {
      const startX = Math.max(gridMinX, Math.floor(xs[k] + 0.5));
      const endX   = Math.min(gridMaxX, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let cx = startX; cx <= endX; cx++) {
        cells.push({ x: cx, y: row });
      }
    }
  }
  return cells;
}

/**
 * Returns all grid cells within a selection boundary (lazily computed).
 */
export function getCellsInBoundary(
  boundary: SelectionBoundary,
  gridWidth: number,
  gridHeight: number
): Array<{ x: number; y: number }> {
  if (boundary.kind === 'rect') {
    const cells: Array<{ x: number; y: number }> = [];
    const minX = Math.max(0, boundary.minX);
    const minY = Math.max(0, boundary.minY);
    const maxX = Math.min(gridWidth - 1, boundary.maxX);
    const maxY = Math.min(gridHeight - 1, boundary.maxY);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        cells.push({ x, y });
      }
    }
    return cells;
  }
  return scanlineFill(boundary.polygon, gridWidth, gridHeight);
}

/**
 * Returns true if grid cell (x, y) falls within a selection boundary.
 */
export function isCellInBoundary(
  x: number,
  y: number,
  boundary: SelectionBoundary
): boolean {
  if (boundary.kind === 'rect') {
    return x >= boundary.minX && x <= boundary.maxX && y >= boundary.minY && y <= boundary.maxY;
  }
  return pointInPolygon(x + 0.5, y + 0.5, boundary.polygon);
}

/**
 * Returns the axis-aligned bounding box of any boundary, in grid cell units.
 */
export function getBoundaryBBox(
  boundary: SelectionBoundary
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (boundary.kind === 'rect') {
    return { minX: boundary.minX, maxX: boundary.maxX, minY: boundary.minY, maxY: boundary.maxY };
  }
  const xs = boundary.polygon.map((p) => p.x);
  const ys = boundary.polygon.map((p) => p.y);
  return {
    minX: Math.floor(Math.min(...xs)),
    maxX: Math.ceil(Math.max(...xs)),
    minY: Math.floor(Math.min(...ys)),
    maxY: Math.ceil(Math.max(...ys)),
  };
}
