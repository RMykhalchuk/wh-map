import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import type { GridItem, CustomElement, WallElement } from '../../types';

const CELL_SIZE = 30;
const GRID_PADDING = 16;

const ISO_ANGLE = Math.PI / 6;
const COS = Math.cos(ISO_ANGLE);
const SIN = Math.sin(ISO_ANGLE);

const BLOCK_HEIGHT = 40;
const FLOOR_COLOR = '#d1d5db';
const FLOOR_STROKE = '#9ca3af';
const GRID_LINE_COLOR = 'rgba(156,163,175,0.4)';

function toIso(gridX: number, gridY: number, cellSize: number) {
  const wx = gridX * cellSize;
  const wy = gridY * cellSize;
  const sx = (wx - wy) * COS;
  const sy = (wx + wy) * SIN;
  return { sx, sy };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function adjustColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  return `rgb(${r},${g},${b})`;
}

interface IsometricBlock {
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  color: string;
  label: string;
  childCount?: number;
  childLabel?: string;
  id: string;
  isCustom?: boolean;
  onClick?: () => void;
}

interface Props {
  items: GridItem[];
  customItems: CustomElement[];
  wallItems: WallElement[];
  gridCols: number;
  gridRows: number;
  onNavigate: (elementId: string) => void;
}

function drawIsoBlock(
  ctx: CanvasRenderingContext2D,
  block: IsometricBlock,
  cellSize: number,
  originX: number,
  originY: number,
  hovered: boolean,
) {
  const { gridX, gridY, gridW, gridH, color } = block;

  const topLeft = toIso(gridX, gridY, cellSize);
  const topRight = toIso(gridX + gridW, gridY, cellSize);
  const bottomRight = toIso(gridX + gridW, gridY + gridH, cellSize);
  const bottomLeft = toIso(gridX, gridY + gridH, cellSize);

  const pts = [topLeft, topRight, bottomRight, bottomLeft].map(p => ({
    x: p.sx + originX,
    y: p.sy + originY,
  }));

  const h = hovered ? BLOCK_HEIGHT * 1.15 : BLOCK_HEIGHT;

  const topFace = pts.map(p => ({ x: p.x, y: p.y - h }));

  const topColor = hovered ? adjustColor(color, 1.12) : color;
  const rightColor = adjustColor(color, 0.68);
  const leftColor = adjustColor(color, 0.82);

  ctx.beginPath();
  ctx.moveTo(pts[3].x, pts[3].y);
  ctx.lineTo(pts[3].x, pts[3].y - h);
  ctx.lineTo(pts[0].x, pts[0].y - h);
  ctx.lineTo(pts[0].x, pts[0].y);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[1].x, pts[1].y - h);
  ctx.lineTo(pts[2].x, pts[2].y - h);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(topFace[0].x, topFace[0].y);
  for (let i = 1; i < topFace.length; i++) ctx.lineTo(topFace[i].x, topFace[i].y);
  ctx.closePath();

  if (hovered) {
    const grad = ctx.createLinearGradient(topFace[0].x, topFace[0].y, topFace[2].x, topFace[2].y);
    grad.addColorStop(0, adjustColor(topColor, 1.1));
    grad.addColorStop(1, topColor);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = topColor;
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  if (hovered) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  const centerX = (topFace[0].x + topFace[1].x + topFace[2].x + topFace[3].x) / 4;
  const centerY = (topFace[0].y + topFace[1].y + topFace[2].y + topFace[3].y) / 4;

  const topWidth = Math.sqrt(
    (topFace[1].x - topFace[0].x) ** 2 + (topFace[1].y - topFace[0].y) ** 2
  );
  const topDepth = Math.sqrt(
    (topFace[3].x - topFace[0].x) ** 2 + (topFace[3].y - topFace[0].y) ** 2
  );
  const minDim = Math.min(topWidth, topDepth);

  if (minDim > 20) {
    ctx.save();
    const angle = Math.atan2(
      topFace[1].y - topFace[0].y,
      topFace[1].x - topFace[0].x
    );
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    const fontSize = Math.min(13, Math.max(8, minDim * 0.22));
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(block.label, 1, 1);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(block.label, 0, 0);

    if (block.childCount !== undefined && block.childCount > 0 && minDim > 35) {
      const subFontSize = Math.max(7, fontSize * 0.75);
      ctx.font = `${subFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`${block.childCount} ${block.childLabel ?? ''}`, 0, fontSize + 2);
    }
    ctx.restore();
  }
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  gridCols: number,
  gridRows: number,
  cellSize: number,
  originX: number,
  originY: number,
) {
  const corners = [
    toIso(0, 0, cellSize),
    toIso(gridCols, 0, cellSize),
    toIso(gridCols, gridRows, cellSize),
    toIso(0, gridRows, cellSize),
  ].map(p => ({ x: p.sx + originX, y: p.sy + originY }));

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = FLOOR_COLOR;
  ctx.fill();
  ctx.strokeStyle = FLOOR_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = 0.5;
  for (let col = 0; col <= gridCols; col++) {
    const start = toIso(col, 0, cellSize);
    const end = toIso(col, gridRows, cellSize);
    ctx.beginPath();
    ctx.moveTo(start.sx + originX, start.sy + originY);
    ctx.lineTo(end.sx + originX, end.sy + originY);
    ctx.stroke();
  }
  for (let row = 0; row <= gridRows; row++) {
    const start = toIso(0, row, cellSize);
    const end = toIso(gridCols, row, cellSize);
    ctx.beginPath();
    ctx.moveTo(start.sx + originX, start.sy + originY);
    ctx.lineTo(end.sx + originX, end.sy + originY);
    ctx.stroke();
  }
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  walls: WallElement[],
  cellSize: number,
  originX: number,
  originY: number,
) {
  for (const wall of walls) {
    if (wall.points.length < 2) continue;
    ctx.save();
    ctx.strokeStyle = wall.color || '#475569';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const projected = wall.points.map(p => {
      const iso = toIso(p.x, p.y, cellSize);
      return { x: iso.sx + originX, y: iso.sy + originY - 20 };
    });

    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y);
    if (wall.closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function getBlocksFromItems(items: GridItem[], customItems: CustomElement[]): IsometricBlock[] {
  const blocks: IsometricBlock[] = items.map(({ mapElement, label, childCount, childLabel }) => ({
    gridX: mapElement.grid_x,
    gridY: mapElement.grid_y,
    gridW: mapElement.grid_w,
    gridH: mapElement.grid_h,
    color: mapElement.color || '#3b82f6',
    label,
    childCount,
    childLabel,
    id: mapElement.id,
  }));

  for (const el of (customItems || [])) {
    blocks.push({
      gridX: el.grid_x,
      gridY: el.grid_y,
      gridW: el.grid_w,
      gridH: el.grid_h,
      color: el.color || '#64748b',
      label: el.label || '',
      id: el.id,
      isCustom: true,
    });
  }

  return blocks;
}

function computeGridSize(items: GridItem[], customItems: CustomElement[]) {
  let maxCol = 16;
  let maxRow = 12;
  for (const { mapElement: el } of items) {
    maxCol = Math.max(maxCol, el.grid_x + el.grid_w);
    maxRow = Math.max(maxRow, el.grid_y + el.grid_h);
  }
  for (const el of (customItems || [])) {
    maxCol = Math.max(maxCol, el.grid_x + el.grid_w);
    maxRow = Math.max(maxRow, el.grid_y + el.grid_h);
  }
  return { gridCols: maxCol + 2, gridRows: maxRow + 2 };
}

export default function Map3DView({ items, customItems, wallItems, onNavigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const { gridCols, gridRows } = computeGridSize(items, customItems);

  const getOrigin = useCallback((w: number, h: number, z: number, p: { x: number; y: number }) => {
    const isoCenter = toIso(gridCols / 2, gridRows / 2, CELL_SIZE);
    return {
      x: w / 2 - isoCenter.sx * z + p.x,
      y: h * 0.38 - isoCenter.sy * z + p.y,
    };
  }, [gridCols, gridRows]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      setCanvasSize({ w: container.clientWidth, h: container.clientHeight });
    });
    ro.observe(container);
    setCanvasSize({ w: container.clientWidth, h: container.clientHeight });
    return () => ro.disconnect();
  }, []);

  const hitTest = useCallback((mouseX: number, mouseY: number, z: number, p: { x: number; y: number }, w: number, h: number): string | null => {
    const origin = getOrigin(w, h, z, p);
    const blocks = getBlocksFromItems(items, customItems);

    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      const { gridX, gridY, gridW, gridH } = block;
      const bh = BLOCK_HEIGHT;

      const topLeft = toIso(gridX, gridY, CELL_SIZE);
      const topRight = toIso(gridX + gridW, gridY, CELL_SIZE);
      const bottomRight = toIso(gridX + gridW, gridY + gridH, CELL_SIZE);
      const bottomLeft = toIso(gridX, gridY + gridH, CELL_SIZE);

      const pts = [topLeft, topRight, bottomRight, bottomLeft].map(pt => ({
        x: pt.sx * z + origin.x,
        y: (pt.sy - bh) * z + origin.y,
      }));

      let inside = false;
      for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
        const xi = pts[j].x, yi = pts[j].y;
        const xj = pts[k].x, yj = pts[k].y;
        const intersect = ((yi > mouseY) !== (yj > mouseY)) &&
          (mouseX < (xj - xi) * (mouseY - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }

      const bottomPts = [topLeft, topRight, bottomRight, bottomLeft].map(pt => ({
        x: pt.sx * z + origin.x,
        y: pt.sy * z + origin.y,
      }));
      let insideBottom = false;
      for (let j = 0, k = bottomPts.length - 1; j < bottomPts.length; k = j++) {
        const xi = bottomPts[j].x, yi = bottomPts[j].y;
        const xj = bottomPts[k].x, yj = bottomPts[k].y;
        const intersect = ((yi > mouseY) !== (yj > mouseY)) &&
          (mouseX < (xj - xi) * (mouseY - yi) / (yj - yi) + xi);
        if (intersect) insideBottom = !insideBottom;
      }

      if (inside || insideBottom) return block.id;
    }
    return null;
  }, [items, customItems, getOrigin]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = canvasSize;
    const z = zoomRef.current;
    const p = panRef.current;
    const origin = getOrigin(w, h, z, p);
    const ox = origin.x;
    const oy = origin.y;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    drawFloor(ctx, gridCols, gridRows, CELL_SIZE * z, ox, oy);
    drawWalls(ctx, wallItems || [], CELL_SIZE * z, ox, oy);

    const blocks = getBlocksFromItems(items, customItems);

    blocks.sort((a, b) => {
      const scoreA = a.gridX + a.gridY;
      const scoreB = b.gridX + b.gridY;
      return scoreA - scoreB;
    });

    for (const block of blocks) {
      const scaled = {
        ...block,
        gridX: block.gridX,
        gridY: block.gridY,
        gridW: block.gridW,
        gridH: block.gridH,
      };
      drawIsoBlock(ctx, scaled, CELL_SIZE * z, ox, oy, hoveredId === block.id);
    }

    ctx.restore();
  }, [canvasSize, items, customItems, wallItems, gridCols, gridRows, hoveredId, getOrigin]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    render();
  }, [canvasSize, render]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.001 * (e.deltaMode === 1 ? 20 : 1) * 2;
    const newZoom = Math.min(3, Math.max(0.25, zoomRef.current + delta));
    zoomRef.current = newZoom;
    setZoom(newZoom);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      setPan({ ...panRef.current });
      return;
    }

    const hit = hitTest(mx, my, zoomRef.current, panRef.current, canvasSize.w, canvasSize.h);
    if (hit !== hoveredId) setHoveredId(hit);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  }, [hitTest, hoveredId, canvasSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = Math.abs(e.clientX - panStartRef.current.x);
      const dy = Math.abs(e.clientY - panStartRef.current.y);
      isPanningRef.current = false;

      if (dx < 5 && dy < 5) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = hitTest(mx, my, zoomRef.current, panRef.current, canvasSize.w, canvasSize.h);
        if (hit) {
          const item = items.find(i => i.mapElement.id === hit);
          if (item) onNavigate(item.mapElement.element_id);
        }
      }
    }
  }, [hitTest, items, onNavigate, canvasSize]);

  const handleMouseLeave = useCallback(() => {
    isPanningRef.current = false;
    setHoveredId(null);
  }, []);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-50 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block', cursor: 'grab' }}
      />

      {items.length === 0 && customItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <p className="text-slate-400 text-[13px]">Немає елементів для відображення</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-2 py-1 z-50">
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 cursor-pointer transition-all hover:text-slate-900 disabled:opacity-35 disabled:cursor-default"
          title="Зменшити масштаб"
          onClick={() => { const nz = Math.max(0.25, zoomRef.current - 0.1); zoomRef.current = nz; setZoom(nz); }}
          disabled={zoom <= 0.25}
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </button>
        <button
          className="min-w-[44px] h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-600 text-[12px] font-medium tabular-nums cursor-pointer hover:text-slate-900"
          title="Скинути масштаб"
          onClick={() => { zoomRef.current = 1; setZoom(1); setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; }}
        >
          {zoomPct}%
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 cursor-pointer transition-all hover:text-slate-900 disabled:opacity-35 disabled:cursor-default"
          title="Збільшити масштаб"
          onClick={() => { const nz = Math.min(3, zoomRef.current + 0.1); zoomRef.current = nz; setZoom(nz); }}
          disabled={zoom >= 3}
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-slate-800/70 text-slate-300 text-[11px] px-2.5 py-1 rounded-md backdrop-blur-sm pointer-events-none">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
        </svg>
        Перетягніть для переміщення • Ctrl+колесо для зуму • Клік для навігації
      </div>
    </div>
  );
}
