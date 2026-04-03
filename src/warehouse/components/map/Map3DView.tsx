import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import type { MapElement, WallElement, Location, Zone, Sector, Row, Shelf, CustomElement } from '../../types';

const CELL = 48;
const ISO_X = Math.cos(Math.PI / 6);
const ISO_Y = Math.sin(Math.PI / 6);

function toIso(gx: number, gy: number, z: number) {
  const wx = gx * CELL * z;
  const wy = gy * CELL * z;
  return { sx: (wx - wy) * ISO_X, sy: (wx + wy) * ISO_Y };
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function darken(hex: string, factor: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lighten(hex: string, factor: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor,
  );
}

function hexOk(h?: string | null) {
  return h && /^#[0-9a-fA-F]{6}$/.test(h) ? h : '#64748b';
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

interface SceneItem {
  type: 'floor' | 'shelf';
  depth: number;
  gx: number;
  gy: number;
  gw: number;
  gh: number;
  color: string;
  label: string;
  sublabel?: string;
  elementId?: string;
  sortKey: number;
}

const SHELF_FLOORS = 3;

function buildScene(data: FullWarehouseData): SceneItem[] {
  const { mapElements, locations, zones, sectors, rows, shelves } = data;

  const locMap = new Map(locations.map(l => [l.id, l]));
  const zoneMap = new Map(zones.map(z => [z.id, z]));
  const sectorMap = new Map(sectors.map(s => [s.id, s]));
  const rowMap = new Map(rows.map(r => [r.id, r]));

  const zoneCountOf = (locId: string) => zones.filter(z => z.location_id === locId).length;
  const sectorCountOf = (zoneId: string) => sectors.filter(s => s.zone_id === zoneId).length;
  const rowCountOf = (secId: string) => rows.filter(r => r.sector_id === secId).length;
  const shelfCountOf = (rowId: string) => shelves.filter(s => s.row_id === rowId).length;

  function pluralUa(n: number, one: string, few: string, many: string) {
    return n === 1 ? `${n} ${one}` : n >= 2 && n <= 4 ? `${n} ${few}` : `${n} ${many}`;
  }

  const locEls = mapElements.filter(m => m.element_type === 'location');
  const zoneEls = mapElements.filter(m => m.element_type === 'zone');
  const sectorEls = mapElements.filter(m => m.element_type === 'sector');
  const rowEls = mapElements.filter(m => m.element_type === 'row');

  const locElMap = new Map(locEls.map(m => [m.element_id, m]));
  const zoneElMap = new Map(zoneEls.map(m => [m.element_id, m]));
  const sectorElMap = new Map(sectorEls.map(m => [m.element_id, m]));

  function zoneAbsPos(zoneId: string): { ox: number; oy: number } {
    const zone = zoneMap.get(zoneId);
    const zEl = zoneElMap.get(zoneId);
    const locEl = zone ? locElMap.get(zone.location_id) : undefined;
    return {
      ox: (zEl?.grid_x ?? 0) + (locEl?.grid_x ?? 0),
      oy: (zEl?.grid_y ?? 0) + (locEl?.grid_y ?? 0),
    };
  }

  function sectorAbsPos(sectorId: string): { ox: number; oy: number } {
    const sec = sectorMap.get(sectorId);
    const secEl = sectorElMap.get(sectorId);
    const zonePart = sec ? zoneAbsPos(sec.zone_id) : { ox: 0, oy: 0 };
    return {
      ox: (secEl?.grid_x ?? 0) + zonePart.ox,
      oy: (secEl?.grid_y ?? 0) + zonePart.oy,
    };
  }

  const items: SceneItem[] = [];

  for (const el of zoneEls) {
    const zone = zoneMap.get(el.element_id);
    const locEl = zone ? locElMap.get(zone.location_id) : undefined;
    const ox = (locEl?.grid_x ?? 0);
    const oy = (locEl?.grid_y ?? 0);
    const c = sectorCountOf(el.element_id);
    const color = hexOk(el.color || zone?.color || '#16a34a');
    items.push({
      type: 'floor',
      depth: 1,
      gx: el.grid_x + ox,
      gy: el.grid_y + oy,
      gw: el.grid_w,
      gh: el.grid_h,
      color,
      label: zone?.name ?? el.element_id,
      sublabel: pluralUa(c, 'сектор', 'сектори', 'секторів'),
      elementId: el.element_id,
      sortKey: (el.grid_x + ox) + (el.grid_y + oy),
    });
  }

  for (const el of sectorEls) {
    const sec = sectorMap.get(el.element_id);
    const { ox, oy } = sec ? zoneAbsPos(sec.zone_id) : { ox: 0, oy: 0 };
    const c = rowCountOf(el.element_id);
    const color = hexOk(el.color || sec?.color || '#dc2626');
    items.push({
      type: 'floor',
      depth: 2,
      gx: el.grid_x + ox,
      gy: el.grid_y + oy,
      gw: el.grid_w,
      gh: el.grid_h,
      color,
      label: sec?.name ?? el.element_id,
      sublabel: pluralUa(c, 'ряд', 'ряди', 'рядів'),
      elementId: el.element_id,
      sortKey: (el.grid_x + ox) + (el.grid_y + oy),
    });
  }

  for (const el of rowEls) {
    const row = rowMap.get(el.element_id);
    const { ox, oy } = row ? sectorAbsPos(row.sector_id) : { ox: 0, oy: 0 };
    const c = shelfCountOf(el.element_id);
    const color = hexOk(el.color || row?.color || '#f59e0b');
    items.push({
      type: 'shelf',
      depth: 3,
      gx: el.grid_x + ox,
      gy: el.grid_y + oy,
      gw: el.grid_w,
      gh: el.grid_h,
      color,
      label: row?.name ?? el.element_id,
      sublabel: pluralUa(c, 'стелаж', 'стелажі', 'стелажів'),
      elementId: el.element_id,
      sortKey: (el.grid_x + ox) + (el.grid_y + oy),
    });
  }

  for (const el of data.customElements || []) {
    items.push({
      type: 'floor',
      depth: 4,
      gx: el.grid_x,
      gy: el.grid_y,
      gw: el.grid_w,
      gh: el.grid_h,
      color: hexOk(el.color),
      label: el.label || '',
      sortKey: el.grid_x + el.grid_y,
    });
  }

  return items;
}

function computeWorldSize(items: SceneItem[]): { maxX: number; maxY: number } {
  let maxX = 20, maxY = 16;
  for (const it of items) {
    maxX = Math.max(maxX, it.gx + it.gw + 2);
    maxY = Math.max(maxY, it.gy + it.gh + 2);
  }
  return { maxX, maxY };
}

function drawFloorPad(
  ctx: CanvasRenderingContext2D,
  it: SceneItem,
  z: number,
  ox: number,
  oy: number,
  alpha: number,
) {
  const { r, g, b } = hexToRgb(it.color);
  const tl = toIso(it.gx, it.gy, z);
  const tr = toIso(it.gx + it.gw, it.gy, z);
  const br = toIso(it.gx + it.gw, it.gy + it.gh, z);
  const bl = toIso(it.gx, it.gy + it.gh, z);

  ctx.beginPath();
  ctx.moveTo(tl.sx + ox, tl.sy + oy);
  ctx.lineTo(tr.sx + ox, tr.sy + oy);
  ctx.lineTo(br.sx + ox, br.sy + oy);
  ctx.lineTo(bl.sx + ox, bl.sy + oy);
  ctx.closePath();
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, alpha * 2.5)})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawShelfUnit(
  ctx: CanvasRenderingContext2D,
  it: SceneItem,
  z: number,
  ox: number,
  oy: number,
  hovered: boolean,
) {
  const cellSize = CELL * z;
  const frameColor = '#2c2c2c';
  const frameColorLight = '#555';

  const totalWidth = it.gw;
  const totalDepth = it.gh;

  const unitW = Math.max(1, Math.round(totalWidth));
  const unitD = Math.max(1, Math.round(totalDepth));

  const boxColor = it.color;
  const boxTop = hovered ? lighten(boxColor, 0.25) : lighten(boxColor, 0.15);
  const boxLeft = boxColor;
  const boxRight = darken(boxColor, 0.72);
  const boxShadow = 'rgba(0,0,0,0.18)';

  for (let cx = 0; cx < unitW; cx++) {
    for (let cy = 0; cy < unitD; cy++) {
      const bx = it.gx + cx;
      const by = it.gy + cy;

      const p00 = toIso(bx, by, z);
      const p10 = toIso(bx + 1, by, z);
      const p11 = toIso(bx + 1, by + 1, z);
      const p01 = toIso(bx, by + 1, z);

      const pts = [p00, p10, p11, p01].map(p => ({ x: p.sx + ox, y: p.sy + oy }));

      const SHELF_H_TOTAL = cellSize * 1.6;
      const FRAME_W = cellSize * 0.07;
      const BOX_H = (SHELF_H_TOTAL - FRAME_W * (SHELF_FLOORS + 1)) / SHELF_FLOORS;
      const frameH = FRAME_W;

      const vecX = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
      const vecY = { x: pts[3].x - pts[0].x, y: pts[3].y - pts[0].y };

      function isoPoint(fx: number, fy: number, fz: number) {
        return {
          x: pts[0].x + vecX.x * fx + vecY.x * fy,
          y: pts[0].y + vecX.y * fx + vecY.y * fy - fz,
        };
      }

      ctx.fillStyle = frameColor;
      const postW = 0.08;
      function drawPost(fx: number, fy: number) {
        const p0 = isoPoint(fx, fy, 0);
        const p1 = isoPoint(fx + postW, fy, 0);
        const p2 = isoPoint(fx + postW, fy + postW, 0);
        const p3 = isoPoint(fx, fy + postW, 0);
        const top = [p0, p1, p2, p3].map(p => ({ x: p.x, y: p.y - SHELF_H_TOTAL }));
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(top[3].x, top[3].y);
        ctx.lineTo(top[0].x, top[0].y);
        ctx.lineTo(p0.x, p0.y);
        ctx.closePath();
        ctx.fillStyle = frameColorLight;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(top[1].x, top[1].y);
        ctx.lineTo(top[2].x, top[2].y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.fillStyle = frameColor;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(top[0].x, top[0].y);
        ctx.lineTo(top[1].x, top[1].y);
        ctx.lineTo(top[2].x, top[2].y);
        ctx.lineTo(top[3].x, top[3].y);
        ctx.closePath();
        ctx.fillStyle = '#888';
        ctx.fill();
      }

      drawPost(0, 0);
      drawPost(1 - postW, 0);
      drawPost(0, 1 - postW);
      drawPost(1 - postW, 1 - postW);

      for (let floor = 0; floor < SHELF_FLOORS; floor++) {
        const baseZ = frameH + floor * (BOX_H + frameH);

        const shelfTopZ = baseZ;
        const st0 = isoPoint(0, 0, shelfTopZ);
        const st1 = isoPoint(1, 0, shelfTopZ);
        const st2 = isoPoint(1, 1, shelfTopZ);
        const st3 = isoPoint(0, 1, shelfTopZ);

        ctx.beginPath();
        ctx.moveTo(st0.x, st0.y); ctx.lineTo(st1.x, st1.y); ctx.lineTo(st2.x, st2.y); ctx.lineTo(st3.x, st3.y);
        ctx.closePath();
        ctx.fillStyle = '#4a4a4a';
        ctx.fill();

        const boxGap = 0.05;
        const boxTopZ = baseZ + BOX_H;

        const bx0 = boxGap, bx1 = 1 - boxGap;
        const by0 = boxGap, by1 = 1 - boxGap;

        const bb0 = isoPoint(bx0, by0, shelfTopZ);
        const bb1 = isoPoint(bx1, by0, shelfTopZ);
        const bb2 = isoPoint(bx1, by1, shelfTopZ);
        const bb3 = isoPoint(bx0, by1, shelfTopZ);
        const bt0 = isoPoint(bx0, by0, boxTopZ);
        const bt1 = isoPoint(bx1, by0, boxTopZ);
        const bt2 = isoPoint(bx1, by1, boxTopZ);
        const bt3 = isoPoint(bx0, by1, boxTopZ);

        ctx.beginPath();
        ctx.moveTo(bb3.x, bb3.y); ctx.lineTo(bt3.x, bt3.y); ctx.lineTo(bt0.x, bt0.y); ctx.lineTo(bb0.x, bb0.y);
        ctx.closePath();
        ctx.fillStyle = boxLeft;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.5; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bb1.x, bb1.y); ctx.lineTo(bt1.x, bt1.y); ctx.lineTo(bt2.x, bt2.y); ctx.lineTo(bb2.x, bb2.y);
        ctx.closePath();
        ctx.fillStyle = boxRight;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.5; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bt0.x, bt0.y); ctx.lineTo(bt1.x, bt1.y); ctx.lineTo(bt2.x, bt2.y); ctx.lineTo(bt3.x, bt3.y);
        ctx.closePath();
        ctx.fillStyle = boxTop;
        ctx.fill();
        ctx.strokeStyle = hovered ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = hovered ? 1 : 0.5;
        ctx.stroke();
      }

      if (hovered) {
        const gx0 = isoPoint(0, 0, 0);
        const gx1 = isoPoint(1, 0, 0);
        const gx2 = isoPoint(1, 1, 0);
        const gx3 = isoPoint(0, 1, 0);
        ctx.beginPath();
        ctx.moveTo(gx0.x, gx0.y); ctx.lineTo(gx1.x, gx1.y); ctx.lineTo(gx2.x, gx2.y); ctx.lineTo(gx3.x, gx3.y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
      }
    }
  }
}

function drawFloorGrid(
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
  ctx.fillStyle = '#d1d5db';
  ctx.fill();
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(156,163,175,0.25)';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= maxX; c++) {
    const s = toIso(c, 0, z), e = toIso(c, maxY, z);
    ctx.beginPath();
    ctx.moveTo(s.sx + ox, s.sy + oy);
    ctx.lineTo(e.sx + ox, e.sy + oy);
    ctx.stroke();
  }
  for (let r = 0; r <= maxY; r++) {
    const s = toIso(0, r, z), e = toIso(maxX, r, z);
    ctx.beginPath();
    ctx.moveTo(s.sx + ox, s.sy + oy);
    ctx.lineTo(e.sx + ox, e.sy + oy);
    ctx.stroke();
  }
}

function hitTest(
  mx: number,
  my: number,
  items: SceneItem[],
  z: number,
  ox: number,
  oy: number,
): SceneItem | null {
  const cellSize = CELL * z;
  const SHELF_H = cellSize * 1.4 * z;

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.type !== 'shelf') continue;

    const tl = toIso(it.gx, it.gy, z);
    const tr = toIso(it.gx + it.gw, it.gy, z);
    const br = toIso(it.gx + it.gw, it.gy + it.gh, z);
    const bl = toIso(it.gx, it.gy + it.gh, z);
    const pts = [tl, tr, br, bl].map(p => ({ x: p.sx + ox, y: p.sy + oy }));
    const topPts = pts.map(p => ({ x: p.x, y: p.y - SHELF_H }));

    const inPoly = (poly: { x: number; y: number }[]) => {
      let inside = false;
      for (let j = 0, k = poly.length - 1; j < poly.length; k = j++) {
        if (((poly[j].y > my) !== (poly[k].y > my)) &&
          mx < (poly[k].x - poly[j].x) * (my - poly[j].y) / (poly[k].y - poly[j].y) + poly[j].x)
          inside = !inside;
      }
      return inside;
    };

    if (inPoly([...pts]) || inPoly([...topPts])) return it;
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.type !== 'floor') continue;
    const tl = toIso(it.gx, it.gy, z);
    const tr = toIso(it.gx + it.gw, it.gy, z);
    const br = toIso(it.gx + it.gw, it.gy + it.gh, z);
    const bl = toIso(it.gx, it.gy + it.gh, z);
    const pts = [tl, tr, br, bl].map(p => ({ x: p.sx + ox, y: p.sy + oy }));
    const inPoly = (poly: { x: number; y: number }[]) => {
      let inside = false;
      for (let j = 0, k = poly.length - 1; j < poly.length; k = j++) {
        if (((poly[j].y > my) !== (poly[k].y > my)) &&
          mx < (poly[k].x - poly[j].x) * (my - poly[j].y) / (poly[k].y - poly[j].y) + poly[j].x)
          inside = !inside;
      }
      return inside;
    };
    if (inPoly([...pts])) return it;
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
  const [hoveredItem, setHoveredItem] = useState<SceneItem | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef<SceneItem | null>(null);

  const scene = buildScene(data);
  const { maxX, maxY } = computeWorldSize(scene);

  const floors = scene.filter(s => s.type === 'floor').sort((a, b) => a.depth - b.depth || a.sortKey - b.sortKey);
  const shelves = scene.filter(s => s.type === 'shelf').sort((a, b) => a.sortKey - b.sortKey);

  const getOrigin = useCallback((w: number, h: number, z: number, p: { x: number; y: number }) => {
    const center = toIso(maxX / 2, maxY / 2, z);
    return { x: w / 2 - center.sx + p.x, y: h * 0.45 - center.sy + p.y };
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

    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, 0, w, h);

    drawFloorGrid(ctx, maxX, maxY, z, ox, oy);

    for (const it of floors) {
      const alpha = it.depth === 1 ? 0.22 : it.depth === 2 ? 0.18 : 0.28;
      drawFloorPad(ctx, it, z, ox, oy, alpha);
    }

    for (const it of shelves) {
      const hov = hoveredRef.current === it;
      drawShelfUnit(ctx, it, z, ox, oy, hov);
    }

    ctx.restore();
  }, [canvasSize, floors, shelves, maxX, maxY, getOrigin]);

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
      const delta = -e.deltaY * 0.0015 * (e.deltaMode === 1 ? 20 : 1) * 2;
      const nz = Math.min(3, Math.max(0.2, zoomRef.current + delta));
      zoomRef.current = nz;
      setZoom(nz);
      render();
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [render]);

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
      render();
      return;
    }

    const { x: ox, y: oy } = getOrigin(canvasSize.w, canvasSize.h, zoomRef.current, panRef.current);
    const allItems = [...floors, ...shelves];
    const hit = hitTest(mx, my, allItems, zoomRef.current, ox, oy);
    if (hit !== hoveredRef.current) {
      hoveredRef.current = hit;
      setHoveredItem(hit);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
      render();
    }
  }, [floors, shelves, canvasSize, getOrigin, render]);

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
    if (hoveredRef.current) {
      hoveredRef.current = null;
      setHoveredItem(null);
      render();
    }
  }, [render]);

  const zoomPct = Math.round(zoom * 100);
  const DEPTH_LABELS: Record<number, string> = { 1: 'Зона', 2: 'Сектор', 3: 'Ряд', 4: "Об'єкт" };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none" style={{ background: '#d1d5db' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block', cursor: 'grab' }}
      />

      {hoveredItem && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div className="bg-slate-900/85 backdrop-blur-sm text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-slate-400 font-normal text-[10px]">{DEPTH_LABELS[hoveredItem.depth] ?? ''}</span>
            <span>{hoveredItem.label}</span>
            {hoveredItem.sublabel && <span className="text-slate-300 font-normal">— {hoveredItem.sublabel}</span>}
            {hoveredItem.elementId && <span className="text-sky-400 text-[10px]">Клік для навігації</span>}
          </div>
        </div>
      )}

      <div className="absolute bottom-14 left-5 pointer-events-none z-10 flex flex-col gap-1">
        {[
          { depth: 1, color: '#16a34a', label: 'Зони' },
          { depth: 2, color: '#dc2626', label: 'Сектори' },
          { depth: 3, color: '#f59e0b', label: 'Ряди (стелажі)' },
        ].map(item => (
          <div key={item.depth} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-slate-600 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-5 right-5 flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-2 py-1 z-50">
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 cursor-pointer hover:text-slate-900 disabled:opacity-35"
          onClick={() => { const nz = Math.max(0.2, zoomRef.current - 0.15); zoomRef.current = nz; setZoom(nz); render(); }}
          disabled={zoom <= 0.2}
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </button>
        <button
          className="min-w-[44px] h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-600 text-[12px] font-medium tabular-nums cursor-pointer hover:text-slate-900"
          onClick={() => { zoomRef.current = 1; setZoom(1); panRef.current = { x: 0, y: 0 }; render(); }}
        >
          {zoomPct}%
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 cursor-pointer hover:text-slate-900 disabled:opacity-35"
          onClick={() => { const nz = Math.min(3, zoomRef.current + 0.15); zoomRef.current = nz; setZoom(nz); render(); }}
          disabled={zoom >= 3}
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute bottom-5 left-5 text-[10px] text-slate-500 pointer-events-none">
        Перетягніть • Ctrl+колесо для зуму • Клік для навігації
      </div>
    </div>
  );
}
