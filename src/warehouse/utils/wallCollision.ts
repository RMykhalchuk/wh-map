import type { WallElement } from '../types';
import { CELL_SIZE, GRID_PADDING } from '../components/map/MapCard';

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const ex = cx - ax, ey = cy - ay;
  const t = (ex * d2y - ey * d2x) / cross;
  const u = (ex * d1y - ey * d1x) / cross;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function rectSegments(rx: number, ry: number, rw: number, rh: number): [number, number, number, number][] {
  return [
    [rx, ry, rx + rw, ry],
    [rx + rw, ry, rx + rw, ry + rh],
    [rx + rw, ry + rh, rx, ry + rh],
    [rx, ry + rh, rx, ry],
  ];
}

function toPixel(gx: number, gy: number): { px: number; py: number } {
  return {
    px: gx * CELL_SIZE + GRID_PADDING,
    py: gy * CELL_SIZE + GRID_PADDING,
  };
}

export function rectIntersectsWalls(gridX: number, gridY: number, gridW: number, gridH: number, walls: WallElement[]): boolean {
  if (!walls || walls.length === 0) return false;

  const p0 = toPixel(gridX, gridY);
  const p1 = toPixel(gridX + gridW, gridY + gridH);
  const rx = p0.px, ry = p0.py;
  const rw = p1.px - p0.px, rh = p1.py - p0.py;
  const rSegs = rectSegments(rx, ry, rw, rh);

  for (const wall of walls) {
    const pts = wall.points;
    if (!pts || pts.length < 2) continue;

    const count = wall.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      const a = toPixel(pts[i].x, pts[i].y);
      const b = toPixel(pts[(i + 1) % pts.length].x, pts[(i + 1) % pts.length].y);

      for (const [rx1, ry1, rx2, ry2] of rSegs) {
        if (segmentsIntersect(a.px, a.py, b.px, b.py, rx1, ry1, rx2, ry2)) {
          return true;
        }
      }
    }
  }

  return false;
}
