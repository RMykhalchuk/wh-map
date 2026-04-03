import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import type { MapElement, CustomElement, WallElement, Location, Zone, Sector, Row, Shelf } from '../../types';

const CELL = 30;

const ISO_X = Math.cos(Math.PI / 6);
const ISO_Y = Math.sin(Math.PI / 6);

function toIso(gx: number, gy: number, z: number): { sx: number; sy: number } {
  const wx = gx * CELL * z;
  const wy = gy * CELL * z;
  return { sx: (wx - wy) * ISO_X, sy: (wx + wy) * ISO_Y };
}

function lerpColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  return `rgb(${clamp(r * factor)},${clamp(g * factor)},${clamp(b * factor)})`;
}

function hexOk(h: string) {
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h : '#64748b';
}

interface Block3D {
  gx: number;
  gy: number;
  gw: number;
  gh: number;
  bh: number;
  color: string;
  label: string;
  sublabel?: string;
  elementId?: string;
  depth: number;
}

interface FullWarehouseData {
  mapElements: MapElement[];
  customElements: CustomElement[];
  wallElements: WallElement[];
  locations: Location[];
  zones: Zone[];
  sectors: Sector[];
  rows: Row[];
  shelves: Shelf[];
}

const BLOCK_HEIGHTS: Record<number, number> = {
  0: 10,
  1: 26,
  2: 40,
  3: 55,
  4: 68,
};

const DEPTH_OFFSETS: Record<number, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
};

function buildBlocks(data: FullWarehouseData): Block3D[] {
  const { mapElements, locations, zones, sectors, rows, shelves } = data;

  const locMap = new Map(locations.map(l => [l.id, l]));
  const zoneMap = new Map(zones.map(z => [z.id, z]));
  const sectorMap = new Map(sectors.map(s => [s.id, s]));
  const rowMap = new Map(rows.map(r => [r.id, r]));

  const zoneCount = (locId: string) => zones.filter(z => z.location_id === locId).length;
  const sectorCount = (zoneId: string) => sectors.filter(s => s.zone_id === zoneId).length;
  const rowCount = (secId: string) => rows.filter(r => r.sector_id === secId).length;
  const shelfCount = (rowId: string) => shelves.filter(s => s.row_id === rowId).length;

  const pluralUa = (n: number, one: string, few: string, many: string) =>
    n === 1 ? `${n} ${one}` : n >= 2 && n <= 4 ? `${n} ${few}` : `${n} ${many}`;

  const blocks: Block3D[] = [];

  for (const el of mapElements) {
    if (el.element_type === 'location') {
      const loc = locMap.get(el.element_id);
      const c = zoneCount(el.element_id);
      blocks.push({
        gx: el.grid_x, gy: el.grid_y, gw: el.grid_w, gh: el.grid_h,
        bh: BLOCK_HEIGHTS[0],
        color: hexOk(el.color || loc?.color || '#2563eb'),
        label: loc?.name ?? el.element_id,
        sublabel: pluralUa(c, 'зона', 'зони', 'зон'),
        elementId: el.element_id,
        depth: 0,
      });
    }

    if (el.element_type === 'zone') {
      const zone = zoneMap.get(el.element_id);
      const locEl = mapElements.find(m => m.element_type === 'location' && m.element_id === zone?.location_id);
      const offsetX = locEl ? locEl.grid_x : 0;
      const offsetY = locEl ? locEl.grid_y : 0;
      const c = sectorCount(el.element_id);
      blocks.push({
        gx: el.grid_x + offsetX, gy: el.grid_y + offsetY, gw: el.grid_w, gh: el.grid_h,
        bh: BLOCK_HEIGHTS[1],
        color: hexOk(el.color || zone?.color || '#16a34a'),
        label: zone?.name ?? el.element_id,
        sublabel: pluralUa(c, 'сектор', 'сектори', 'секторів'),
        elementId: el.element_id,
        depth: 1,
      });
    }

    if (el.element_type === 'sector') {
      const sec = sectorMap.get(el.element_id);
      const zoneEl = mapElements.find(m => m.element_type === 'zone' && m.element_id === sec?.zone_id);
      const zone = sec ? zoneMap.get(sec.zone_id) : undefined;
      const locEl = zoneEl ? mapElements.find(m => m.element_type === 'location' && m.element_id === zone?.location_id) : undefined;
      const zoneOffX = zoneEl ? zoneEl.grid_x : 0;
      const zoneOffY = zoneEl ? zoneEl.grid_y : 0;
      const locOffX = locEl ? locEl.grid_x : 0;
      const locOffY = locEl ? locEl.grid_y : 0;
      const c = rowCount(el.element_id);
      blocks.push({
        gx: el.grid_x + zoneOffX + locOffX,
        gy: el.grid_y + zoneOffY + locOffY,
        gw: el.grid_w, gh: el.grid_h,
        bh: BLOCK_HEIGHTS[2],
        color: hexOk(el.color || sec?.color || '#dc2626'),
        label: sec?.name ?? el.element_id,
        sublabel: pluralUa(c, 'ряд', 'ряди', 'рядів'),
        elementId: el.element_id,
        depth: 2,
      });
    }

    if (el.element_type === 'row') {
      const row = rowMap.get(el.element_id);
      const secEl = mapElements.find(m => m.element_type === 'sector' && m.element_id === row?.sector_id);
      const sec = row ? sectorMap.get(row.sector_id) : undefined;
      const zoneEl = sec ? mapElements.find(m => m.element_type === 'zone' && m.element_id === sec.zone_id) : undefined;
      const zone = sec ? zoneMap.get(sec.zone_id) : undefined;
      const locEl = zone ? mapElements.find(m => m.element_type === 'location' && m.element_id === zone.location_id) : undefined;
      const secOffX = secEl ? secEl.grid_x : 0;
      const secOffY = secEl ? secEl.grid_y : 0;
      const zoneOffX = zoneEl ? zoneEl.grid_x : 0;
      const zoneOffY = zoneEl ? zoneEl.grid_y : 0;
      const locOffX = locEl ? locEl.grid_x : 0;
      const locOffY = locEl ? locEl.grid_y : 0;
      const c = shelfCount(el.element_id);
      blocks.push({
        gx: el.grid_x + secOffX + zoneOffX + locOffX,
        gy: el.grid_y + secOffY + zoneOffY + locOffY,
        gw: el.grid_w, gh: el.grid_h,
        bh: BLOCK_HEIGHTS[3],
        color: hexOk(el.color || row?.color || '#f59e0b'),
        label: row?.name ?? el.element_id,
        sublabel: pluralUa(c, 'стелаж', 'стелажі', 'стелажів'),
        elementId: el.element_id,
        depth: 3,
      });
    }
  }

  for (const el of (data.customElements || [])) {
    blocks.push({
      gx: el.grid_x, gy: el.grid_y, gw: el.grid_w, gh: el.grid_h,
      bh: BLOCK_HEIGHTS[4],
      color: hexOk(el.color || '#64748b'),
      label: el.label || '',
      depth: 4,
    });
  }

  return blocks;
}

function computeWorldSize(blocks: Block3D[]): { maxX: number; maxY: number } {
  let maxX = 16, maxY = 12;
  for (const b of blocks) {
    maxX = Math.max(maxX, b.gx + b.gw + 1);
    maxY = Math.max(maxY, b.gy + b.gh + 1);
  }
  return { maxX, maxY };
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: Block3D,
  z: number,
  ox: number,
  oy: number,
  hovered: boolean,
) {
  const tl = toIso(b.gx, b.gy, z);
  const tr = toIso(b.gx + b.gw, b.gy, z);
  const br = toIso(b.gx + b.gw, b.gy + b.gh, z);
  const bl = toIso(b.gx, b.gy + b.gh, z);

  const pts = [tl, tr, br, bl].map(p => ({ x: p.sx + ox, y: p.sy + oy }));
  const bh = (hovered ? b.bh * 1.15 : b.bh) * z;

  const top = pts.map(p => ({ x: p.x, y: p.y - bh }));

  const color = b.color;
  const topColor = hovered ? lerpColor(color, 1.1) : color;
  const leftColor = lerpColor(color, 0.78);
  const rightColor = lerpColor(color, 0.62);
  const strokeC = 'rgba(0,0,0,0.15)';

  ctx.lineWidth = 0.5;
  ctx.strokeStyle = strokeC;

  ctx.beginPath();
  ctx.moveTo(pts[3].x, pts[3].y);
  ctx.lineTo(top[3].x, top[3].y);
  ctx.lineTo(top[0].x, top[0].y);
  ctx.lineTo(pts[0].x, pts[0].y);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pts[1].x, pts[1].y);
  ctx.lineTo(top[1].x, top[1].y);
  ctx.lineTo(top[2].x, top[2].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i].x, top[i].y);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = hovered ? 'rgba(255,255,255,0.5)' : strokeC;
  ctx.lineWidth = hovered ? 1 : 0.5;
  ctx.stroke();

  const cx = top.reduce((s, p) => s + p.x, 0) / 4;
  const cy = top.reduce((s, p) => s + p.y, 0) / 4;
  const topWidth = Math.hypot(top[1].x - top[0].x, top[1].y - top[0].y);
  const topDepth = Math.hypot(top[3].x - top[0].x, top[3].y - top[0].y);
  const minDim = Math.min(topWidth, topDepth);

  if (minDim > 16) {
    ctx.save();
    const angle = Math.atan2(top[1].y - top[0].y, top[1].x - top[0].x);
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const fs = Math.min(11, Math.max(7, minDim * 0.2));
    ctx.font = `bold ${fs}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(b.label, 0.8, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fillText(b.label, 0, 0);

    if (b.sublabel && minDim > 32) {
      const sfs = Math.max(6, fs * 0.75);
      ctx.font = `${sfs}px system-ui,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(b.sublabel, 0, fs + 1);
    }
    ctx.restore();
  }
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  maxX: number,
  maxY: number,
  z: number,
  ox: number,
  oy: number,
) {
  const corners = [
    toIso(0, 0, z), toIso(maxX, 0, z),
    toIso(maxX, maxY, z), toIso(0, maxY, z),
  ].map(p => ({ x: p.sx + ox, y: p.sy + oy }));

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(148,163,184,0.3)';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= maxX; c += 2) {
    const s = toIso(c, 0, z), e = toIso(c, maxY, z);
    ctx.beginPath();
    ctx.moveTo(s.sx + ox, s.sy + oy);
    ctx.lineTo(e.sx + ox, e.sy + oy);
    ctx.stroke();
  }
  for (let r = 0; r <= maxY; r += 2) {
    const s = toIso(0, r, z), e = toIso(maxX, r, z);
    ctx.beginPath();
    ctx.moveTo(s.sx + ox, s.sy + oy);
    ctx.lineTo(e.sx + ox, e.sy + oy);
    ctx.stroke();
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, walls: WallElement[], z: number, ox: number, oy: number) {
  for (const wall of walls) {
    if (wall.points.length < 2) continue;
    ctx.save();
    ctx.strokeStyle = wall.color || '#475569';
    ctx.lineWidth = 2 * z;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pts = wall.points.map(p => {
      const iso = toIso(p.x, p.y, z);
      return { x: iso.sx + ox, y: iso.sy + oy - 18 * z };
    });
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (wall.closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function hitTest(
  mx: number, my: number,
  blocks: Block3D[],
  z: number, ox: number, oy: number,
): Block3D | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    const bh = b.bh * z;
    const tl = toIso(b.gx, b.gy, z);
    const tr = toIso(b.gx + b.gw, b.gy, z);
    const br = toIso(b.gx + b.gw, b.gy + b.gh, z);
    const bl = toIso(b.gx, b.gy + b.gh, z);

    const top = [tl, tr, br, bl].map(p => ({ x: p.sx + ox, y: p.sy + oy - bh }));
    const bottom = [tl, tr, br, bl].map(p => ({ x: p.sx + ox, y: p.sy + oy }));

    const inPoly = (pts: { x: number; y: number }[]) => {
      let inside = false;
      for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
        const xi = pts[j].x, yi = pts[j].y;
        const xj = pts[k].x, yj = pts[k].y;
        if (((yi > my) !== (yj > my)) && (mx < (xj - xi) * (my - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    };

    if (inPoly(top) || inPoly(bottom)) return b;
  }
  return null;
}

interface Props {
  data: FullWarehouseData;
  onNavigate: (elementId: string, depth: number) => void;
}

export default function Map3DView({ data, onNavigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<Block3D | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef<Block3D | null>(null);

  const blocks = buildBlocks(data);
  const { maxX, maxY } = computeWorldSize(blocks);

  const sortedBlocks = [...blocks].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return (a.gx + a.gy) - (b.gx + b.gy);
  });

  const getOrigin = useCallback((w: number, h: number, z: number, p: { x: number; y: number }) => {
    const center = toIso(maxX / 2, maxY / 2, z);
    return { x: w / 2 - center.sx + p.x, y: h * 0.42 - center.sy + p.y };
  }, [maxX, maxY]);

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

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = canvasSize;
    const dpr = window.devicePixelRatio || 1;
    const z = zoomRef.current;
    const p = panRef.current;
    const { x: ox, y: oy } = getOrigin(w, h, z, p);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, w, h);

    drawFloor(ctx, maxX, maxY, z, ox, oy);
    drawWalls(ctx, data.wallElements || [], z, ox, oy);

    for (const b of sortedBlocks) {
      const hov = hoveredRef.current?.gx === b.gx && hoveredRef.current?.gy === b.gy && hoveredRef.current?.depth === b.depth;
      drawBlock(ctx, b, z, ox, oy, hov);
    }

    ctx.restore();
  }, [canvasSize, sortedBlocks, maxX, maxY, data.wallElements, getOrigin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    render();
  }, [canvasSize, render]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.001 * (e.deltaMode === 1 ? 20 : 1) * 2;
      const nz = Math.min(3, Math.max(0.2, zoomRef.current + delta));
      zoomRef.current = nz;
      setZoom(nz);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isPanRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      setPan({ ...panRef.current });
      return;
    }

    const { x: ox, y: oy } = getOrigin(canvasSize.w, canvasSize.h, zoomRef.current, panRef.current);
    const hit = hitTest(mx, my, sortedBlocks, zoomRef.current, ox, oy);
    hoveredRef.current = hit;
    setHoveredBlock(hit);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
    render();
  }, [sortedBlocks, canvasSize, getOrigin, render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      isPanRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const moved = Math.hypot(e.clientX - panStartRef.current.x, e.clientY - panStartRef.current.y);
    isPanRef.current = false;
    if (moved < 5 && hoveredRef.current?.elementId) {
      onNavigate(hoveredRef.current.elementId, hoveredRef.current.depth);
    }
  }, [onNavigate]);

  const handleMouseLeave = useCallback(() => {
    isPanRef.current = false;
    hoveredRef.current = null;
    setHoveredBlock(null);
    render();
  }, [render]);

  const zoomPct = Math.round(zoom * 100);

  const DEPTH_LABELS = ['Склади', 'Зони', 'Сектори', 'Ряди', 'Об\'єкти'];

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-100 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block', cursor: 'grab' }}
      />

      {hoveredBlock && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div className="bg-slate-900/80 backdrop-blur-sm text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-slate-400 font-normal text-[10px]">{DEPTH_LABELS[hoveredBlock.depth] ?? ''}</span>
            <span>{hoveredBlock.label}</span>
            {hoveredBlock.sublabel && <span className="text-slate-300 font-normal">— {hoveredBlock.sublabel}</span>}
            {hoveredBlock.elementId && <span className="text-sky-400 text-[10px]">Клік для навігації</span>}
          </div>
        </div>
      )}

      <div className="absolute bottom-16 left-6 pointer-events-none z-10 flex flex-col gap-1">
        {[
          { depth: 0, color: '#2563eb', label: 'Склади' },
          { depth: 1, color: '#16a34a', label: 'Зони' },
          { depth: 2, color: '#dc2626', label: 'Сектори' },
          { depth: 3, color: '#f59e0b', label: 'Ряди' },
          { depth: 4, color: '#64748b', label: 'Об\'єкти' },
        ].map(item => (
          <div key={item.depth} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-slate-500 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-2 py-1 z-50">
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 cursor-pointer hover:text-slate-900 disabled:opacity-35"
          onClick={() => { const nz = Math.max(0.2, zoomRef.current - 0.1); zoomRef.current = nz; setZoom(nz); }}
          disabled={zoom <= 0.2}
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </button>
        <button
          className="min-w-[44px] h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-600 text-[12px] font-medium tabular-nums cursor-pointer hover:text-slate-900"
          onClick={() => { zoomRef.current = 1; setZoom(1); setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; }}
        >
          {zoomPct}%
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 cursor-pointer hover:text-slate-900 disabled:opacity-35"
          onClick={() => { const nz = Math.min(3, zoomRef.current + 0.1); zoomRef.current = nz; setZoom(nz); }}
          disabled={zoom >= 3}
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute bottom-6 left-6 text-[10px] text-slate-400 pointer-events-none">
        Перетягніть • Ctrl+колесо для зуму • Клік для навігації
      </div>
    </div>
  );
}
