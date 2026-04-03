import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CELL_SIZE, GRID_PADDING } from './MapCard';
import ColorPicker from '../common/ColorPicker';
import type { WallElement, GridPoint } from '../../types';

const NODE_R = 6;
const HIT_R = 10;
const STROKE_WIDTH = 5;
const HIT_STROKE = 14;

function toSvg(gx: number, gy: number): { sx: number; sy: number } {
  return {
    sx: gx * CELL_SIZE + GRID_PADDING,
    sy: gy * CELL_SIZE + GRID_PADDING,
  };
}

function snapToGrid(px: number, py: number, cols: number, rows: number): GridPoint {
  return {
    x: Math.max(0, Math.min(cols, Math.round((px - GRID_PADDING) / CELL_SIZE))),
    y: Math.max(0, Math.min(rows, Math.round((py - GRID_PADDING) / CELL_SIZE))),
  };
}

function orthogonalSnap(prev: GridPoint, cur: GridPoint): GridPoint {
  const dx = Math.abs(cur.x - prev.x);
  const dy = Math.abs(cur.y - prev.y);
  if (dx >= dy) return { x: cur.x, y: prev.y };
  return { x: prev.x, y: cur.y };
}

function getSvgRect(e: React.MouseEvent): DOMRect {
  const svg = (e.target as Element).closest('svg') || (e.currentTarget as Element).closest('svg');
  return svg!.getBoundingClientRect();
}

interface WallShapeProps {
  wall: WallElement;
  gridCols: number;
  gridRows: number;
  readonly: boolean;
  onUpdate: (updates: Partial<WallElement>) => void;
  onDelete: () => void;
}

function WallShape({ wall, gridCols, gridRows, readonly, onUpdate, onDelete }: WallShapeProps) {
  const [draggingNode, setDraggingNode] = useState<number | null>(null);
  const [draggingAll, setDraggingAll] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null);
  const [extending, setExtending] = useState<'start' | 'end' | null>(null);
  const [extendPreview, setExtendPreview] = useState<GridPoint | null>(null);
  const colorBtnRef = useRef<HTMLDivElement>(null);

  const { points, closed, color } = wall;

  const svgPoints = points.map(p => toSvg(p.x, p.y));
  const lineStr = svgPoints.map(p => `${p.sx},${p.sy}`).join(' ');
  const closedStr = closed ? `${lineStr} ${svgPoints[0].sx},${svgPoints[0].sy}` : lineStr;

  const midIdx = Math.floor(svgPoints.length / 2);
  const midPoint = svgPoints.length >= 2
    ? { sx: (svgPoints[0].sx + svgPoints[midIdx].sx) / 2, sy: (svgPoints[0].sy + svgPoints[midIdx].sy) / 2 }
    : svgPoints[0];

  function handleLineMouseDown(e: React.MouseEvent) {
    if (readonly) return;
    if ((e.target as Element).dataset.node) return;
    e.preventDefault();
    e.stopPropagation();
    setShowActions(false);

    const rect = getSvgRect(e);
    const startPx = e.clientX - rect.left;
    const startPy = e.clientY - rect.top;
    const startSnap = snapToGrid(startPx, startPy, gridCols, gridRows);
    const startPoints = points.map(p => ({ ...p }));
    let moved = false;

    setDraggingAll(true);

    function onMove(me: MouseEvent) {
      const px = me.clientX - rect.left;
      const py = me.clientY - rect.top;
      const curSnap = snapToGrid(px, py, gridCols, gridRows);
      const dx = curSnap.x - startSnap.x;
      const dy = curSnap.y - startSnap.y;
      if (dx === 0 && dy === 0) return;
      moved = true;
      const newPts = startPoints.map(p => ({
        x: Math.max(0, Math.min(gridCols, p.x + dx)),
        y: Math.max(0, Math.min(gridRows, p.y + dy)),
      }));
      onUpdate({ points: newPts });
    }

    function onUp() {
      setDraggingAll(false);
      if (!moved) setShowActions(v => !v);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleNodeMouseDown(e: React.MouseEvent, nodeIdx: number) {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingNode(nodeIdx);
    setShowActions(false);

    const rect = getSvgRect(e);
    const prevPt = nodeIdx > 0 ? points[nodeIdx - 1] : (closed ? points[points.length - 1] : null);
    const nextPt = nodeIdx < points.length - 1 ? points[nodeIdx + 1] : (closed ? points[0] : null);

    function onMove(me: MouseEvent) {
      const px = me.clientX - rect.left;
      const py = me.clientY - rect.top;
      let snapped = snapToGrid(px, py, gridCols, gridRows);
      if (!me.shiftKey) {
        const neighbor = prevPt ?? nextPt;
        if (neighbor) snapped = orthogonalSnap(neighbor, snapped);
      }
      const newPts = points.map((p, i) => i === nodeIdx ? snapped : p);
      onUpdate({ points: newPts });
    }

    function onUp() {
      setDraggingNode(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleAddNode(e: React.MouseEvent, segIdx: number) {
    if (readonly) return;
    e.stopPropagation();
    const rect = getSvgRect(e);
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const snapped = snapToGrid(px, py, gridCols, gridRows);
    const newPts = [...points.slice(0, segIdx + 1), snapped, ...points.slice(segIdx + 1)];
    onUpdate({ points: newPts });
  }

  function handleDeleteNode(e: React.MouseEvent, nodeIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    if (points.length <= 2) { onDelete(); return; }
    onUpdate({ points: points.filter((_, i) => i !== nodeIdx) });
  }

  function handleDeleteSegment(e: React.MouseEvent, segIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    const nextIdx = (segIdx + 1) % points.length;
    const lower = Math.min(segIdx, nextIdx);
    const upper = Math.max(segIdx, nextIdx);
    if (closed) {
      if (points.length <= 3) { onDelete(); return; }
      if (lower === 0 && upper === points.length - 1) {
        const newPts = points.slice(0, points.length - 1);
        if (newPts.length < 2) { onDelete(); return; }
        onUpdate({ points: newPts, closed: false });
      } else {
        const newPts = points.filter((_, i) => i !== lower && i !== upper);
        if (newPts.length < 2) { onDelete(); return; }
        onUpdate({ points: newPts });
      }
    } else {
      if (points.length <= 2) { onDelete(); return; }
      const newPts = points.filter((_, i) => i !== lower && i !== upper);
      if (newPts.length < 2) { onDelete(); return; }
      onUpdate({ points: newPts });
    }
    setHoveredSeg(null);
  }

  function handleExtendStart(e: React.MouseEvent, endType: 'start' | 'end') {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    setExtending(endType);
    setShowActions(false);

    const rect = getSvgRect(e);
    const anchorPt = endType === 'start' ? points[0] : points[points.length - 1];

    function onMove(me: MouseEvent) {
      const px = me.clientX - rect.left;
      const py = me.clientY - rect.top;
      let snapped = snapToGrid(px, py, gridCols, gridRows);
      if (!me.shiftKey) snapped = orthogonalSnap(anchorPt, snapped);
      setExtendPreview(snapped);
    }

    function onUp(me: MouseEvent) {
      const px = me.clientX - rect.left;
      const py = me.clientY - rect.top;
      let snapped = snapToGrid(px, py, gridCols, gridRows);
      if (!me.shiftKey) snapped = orthogonalSnap(anchorPt, snapped);
      if (snapped.x !== anchorPt.x || snapped.y !== anchorPt.y) {
        const newPts = endType === 'start' ? [snapped, ...points] : [...points, snapped];
        onUpdate({ points: newPts });
      }
      setExtending(null);
      setExtendPreview(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const segments: { i: number; mx: number; my: number }[] = [];
  const segCount = closed ? points.length : points.length - 1;
  for (let i = 0; i < segCount; i++) {
    const a = svgPoints[i];
    const b = svgPoints[(i + 1) % svgPoints.length];
    segments.push({ i, mx: (a.sx + b.sx) / 2, my: (a.sy + b.sy) / 2 });
  }

  const lineCursor = readonly ? 'default' : draggingAll ? 'grabbing' : 'grab';

  return (
    <g
      onMouseEnter={() => !readonly && setHovered(true)}
      onMouseLeave={() => { if (!extending) setHovered(false); }}
      style={{ pointerEvents: readonly ? 'none' : 'all' }}
    >
      <polyline
        points={closedStr}
        stroke="transparent"
        strokeWidth={HIT_STROKE}
        fill="none"
        style={{ cursor: lineCursor, pointerEvents: readonly ? 'none' : 'stroke' }}
        onMouseDown={handleLineMouseDown}
      />
      <polyline
        points={closedStr}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
        style={{ pointerEvents: 'none' }}
      />

      {!readonly && hovered && segments.map(({ i, mx, my }) => (
        <g
          key={`seg-${i}`}
          onMouseEnter={() => setHoveredSeg(i)}
          onMouseLeave={() => setHoveredSeg(null)}
          style={{ pointerEvents: 'all' }}
        >
          <circle
            cx={mx} cy={my} r={hoveredSeg === i ? 10 : 5}
            fill={hoveredSeg === i ? 'rgba(239,68,68,0.15)' : 'transparent'}
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
          />
          <circle
            cx={mx} cy={my} r={4}
            fill={hoveredSeg === i ? '#ef4444' : '#fff'}
            stroke={hoveredSeg === i ? '#ef4444' : color}
            strokeWidth={1.5}
            opacity={0.9}
            style={{ cursor: hoveredSeg === i ? 'pointer' : 'copy', pointerEvents: 'none' }}
          />
          {hoveredSeg === i && (
            <>
              <line x1={mx - 2.5} y1={my - 2.5} x2={mx + 2.5} y2={my + 2.5} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              <line x1={mx + 2.5} y1={my - 2.5} x2={mx - 2.5} y2={my + 2.5} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
            </>
          )}
          <circle
            cx={mx} cy={my} r={hoveredSeg === i ? 10 : 5}
            fill="transparent"
            style={{ cursor: hoveredSeg === i ? 'pointer' : 'copy', pointerEvents: 'all' }}
            onClick={hoveredSeg === i ? (e => handleDeleteSegment(e, i)) : undefined}
            onDoubleClick={hoveredSeg !== i ? (e => handleAddNode(e, i)) : undefined}
            title={hoveredSeg === i ? 'Видалити відрізок' : 'Двічі клікніть щоб додати вузол'}
          />
        </g>
      ))}

      {!readonly && points.map((p, idx) => {
        const { sx, sy } = toSvg(p.x, p.y);
        return (
          <g key={idx} style={{ pointerEvents: 'all' }}>
            <circle
              cx={sx} cy={sy} r={HIT_R}
              fill="transparent"
              data-node="true"
              style={{ cursor: 'move' }}
              onMouseDown={e => handleNodeMouseDown(e, idx)}
              onContextMenu={e => { e.preventDefault(); handleDeleteNode(e, idx); }}
            />
            <circle
              cx={sx} cy={sy} r={NODE_R}
              fill={draggingNode === idx ? color : '#fff'}
              stroke={color}
              strokeWidth={2}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}

      {!readonly && !closed && hovered && (() => {
        const startPt = svgPoints[0];
        const endPt = svgPoints[svgPoints.length - 1];
        const isStart = extending === 'start';
        const isEnd = extending === 'end';
        const previewSvg = extendPreview ? toSvg(extendPreview.x, extendPreview.y) : null;

        return (
          <>
            {previewSvg && isStart && (
              <line x1={startPt.sx} y1={startPt.sy} x2={previewSvg.sx} y2={previewSvg.sy} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="square" strokeDasharray="6 4" style={{ pointerEvents: 'none' }} />
            )}
            {previewSvg && isEnd && (
              <line x1={endPt.sx} y1={endPt.sy} x2={previewSvg.sx} y2={previewSvg.sy} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="square" strokeDasharray="6 4" style={{ pointerEvents: 'none' }} />
            )}

            <g style={{ pointerEvents: 'all' }} data-node="true">
              <circle cx={startPt.sx} cy={startPt.sy} r={14} fill="transparent" style={{ pointerEvents: 'all' }} />
              <circle cx={startPt.sx} cy={startPt.sy} r={8} fill={isStart ? color : 'rgba(15,23,42,0.75)'} stroke={color} strokeWidth={2} style={{ cursor: 'crosshair', pointerEvents: 'none' }} />
              <line x1={startPt.sx - 3.5} y1={startPt.sy} x2={startPt.sx + 3.5} y2={startPt.sy} stroke="#fff" strokeWidth={2} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              <line x1={startPt.sx} y1={startPt.sy - 3.5} x2={startPt.sx} y2={startPt.sy + 3.5} stroke="#fff" strokeWidth={2} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              <circle cx={startPt.sx} cy={startPt.sy} r={14} fill="transparent" style={{ cursor: 'crosshair', pointerEvents: 'all' }} title="Продовжити звідси" onMouseDown={e => handleExtendStart(e, 'start')} />
            </g>

            <g style={{ pointerEvents: 'all' }} data-node="true">
              <circle cx={endPt.sx} cy={endPt.sy} r={14} fill="transparent" style={{ pointerEvents: 'all' }} />
              <circle cx={endPt.sx} cy={endPt.sy} r={8} fill={isEnd ? color : 'rgba(15,23,42,0.75)'} stroke={color} strokeWidth={2} style={{ cursor: 'crosshair', pointerEvents: 'none' }} />
              <line x1={endPt.sx - 3.5} y1={endPt.sy} x2={endPt.sx + 3.5} y2={endPt.sy} stroke="#fff" strokeWidth={2} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              <line x1={endPt.sx} y1={endPt.sy - 3.5} x2={endPt.sx} y2={endPt.sy + 3.5} stroke="#fff" strokeWidth={2} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              <circle cx={endPt.sx} cy={endPt.sy} r={14} fill="transparent" style={{ cursor: 'crosshair', pointerEvents: 'all' }} title="Продовжити звідси" onMouseDown={e => handleExtendStart(e, 'end')} />
            </g>
          </>
        );
      })()}

      {!readonly && showActions && midPoint && (
        <>
          <rect x={midPoint.sx - 38} y={midPoint.sy - 18} width={76} height={36} rx={6} fill="rgba(15,23,42,0.85)" style={{ pointerEvents: 'none' }} />
          <foreignObject x={midPoint.sx - 38} y={midPoint.sy - 18} width={76} height={36} style={{ pointerEvents: 'all' }}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 4px', height: '100%' }} ref={colorBtnRef}>
              <button
                style={{ background: 'none', border: 'none', padding: '4px 5px', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,.85)', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Колір"
                onClick={e => {
                  e.stopPropagation();
                  setPickerPos({ top: e.clientY, left: e.clientX + 20 });
                  setShowPicker(v => !v);
                  setShowActions(false);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
              </button>
              <button
                style={{ background: 'none', border: 'none', padding: '4px 5px', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,.85)', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Видалити"
                onClick={e => { e.stopPropagation(); onDelete(); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </foreignObject>
        </>
      )}

      {showPicker && pickerPos && createPortal(
        <ColorPicker
          value={color}
          position={pickerPos}
          onSelect={(c) => { onUpdate({ color: c }); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />,
        document.body
      )}
    </g>
  );
}

interface Props {
  walls: WallElement[];
  gridCols: number;
  gridRows: number;
  svgWidth: number;
  svgHeight: number;
  readonly: boolean;
  onUpdate: (id: string, updates: Partial<WallElement>) => void;
  onDelete: (id: string) => void;
}

export default function WallOverlay({ walls, gridCols, gridRows, svgWidth, svgHeight, readonly, onUpdate, onDelete }: Props) {
  if (!walls || walls.length === 0) return null;

  return (
    <svg className="absolute inset-0 z-20" style={{ width: svgWidth, height: svgHeight, pointerEvents: 'none' }}>
      {walls.map(wall => (
        <WallShape
          key={wall.id}
          wall={wall}
          gridCols={gridCols}
          gridRows={gridRows}
          readonly={readonly}
          onUpdate={updates => onUpdate(wall.id, updates)}
          onDelete={() => onDelete(wall.id)}
        />
      ))}
    </svg>
  );
}
