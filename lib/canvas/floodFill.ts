import { Stitch } from '@/types/pattern';

/**
 * Scan-line flood fill algorithm.
 * Fills all connected cells that share the same color as the target cell.
 * Returns an array of new stitches to apply.
 */
export function floodFill(
  stitches: Map<string, Stitch>,
  startX: number,
  startY: number,
  replacementColor: string,
  width: number,
  height: number
): Stitch[] {
  const targetKey = `${startX},${startY}`;
  const targetStitch = stitches.get(targetKey);
  const targetColor = targetStitch?.dmcCode ?? null;

  // Don't fill if the target is already the replacement color
  if (targetColor === replacementColor) return [];

  const newStitches: Stitch[] = [];
  const visited = new Set<string>();

  // Use a stack-based scan-line approach for efficiency
  const stack: Array<[number, number]> = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;

    // Skip if out of bounds
    if (x < 0 || y < 0 || x >= width || y >= height) continue;

    const key = `${x},${y}`;

    // Skip if already visited
    if (visited.has(key)) continue;

    // Check if this cell matches the target color
    const cellStitch = stitches.get(key);
    const cellColor = cellStitch?.dmcCode ?? null;

    if (cellColor !== targetColor) continue;

    visited.add(key);

    // Scan left to find the leftmost cell in this row
    let leftX = x;
    while (leftX > 0) {
      const leftKey = `${leftX - 1},${y}`;
      if (visited.has(leftKey)) break;
      const leftStitch = stitches.get(leftKey);
      const leftColor = leftStitch?.dmcCode ?? null;
      if (leftColor !== targetColor) break;
      leftX--;
    }

    // Scan right to find the rightmost cell in this row
    let rightX = x;
    while (rightX < width - 1) {
      const rightKey = `${rightX + 1},${y}`;
      if (visited.has(rightKey)) break;
      const rightStitch = stitches.get(rightKey);
      const rightColor = rightStitch?.dmcCode ?? null;
      if (rightColor !== targetColor) break;
      rightX++;
    }

    // Fill the entire span and check rows above and below
    for (let fillX = leftX; fillX <= rightX; fillX++) {
      const fillKey = `${fillX},${y}`;
      visited.add(fillKey);
      newStitches.push({ x: fillX, y, dmcCode: replacementColor });

      // Push cells above and below to the stack
      if (y > 0) {
        const aboveKey = `${fillX},${y - 1}`;
        if (!visited.has(aboveKey)) {
          stack.push([fillX, y - 1]);
        }
      }
      if (y < height - 1) {
        const belowKey = `${fillX},${y + 1}`;
        if (!visited.has(belowKey)) {
          stack.push([fillX, y + 1]);
        }
      }
    }
  }

  return newStitches;
}
