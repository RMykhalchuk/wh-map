import React, { useState, useRef, useEffect } from 'react';
import { CELL_SIZE, GRID_PADDING } from './MapCard';
import type { GridPoint } from '../../types';

const SNAP_DIST = 14;
const STROKE_WIDTH = 5;
const NODE_R = 6;

function snapToGrid(px: number, py: number): GridPoint {
  return {
    x: Math.round((px - GRID_PADDING) / CELL_SIZE),
    y: Math.round((py - GRID_PADDING) / CELL_SIZE),
  };
}

function toSvg(gx: number, gy: number): { sx: number; sy: number } {
  return {
    sx: gx * CELL_SIZE + GRID_PADDING,
    sy: gy * CELL_SIZE + GRID_PADDING,
  };
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function orthogonalSnap(prev: GridPoint, cur: GridPoint): GridPoint {
  const dx = Math.abs(cur.x - prev.x);
  const dy = Math.abs(cur.y - prev.y);
  if (dx >= dy) return { x: cur.x, y: prev.y };
  return { x: prev.x, y: cur.y };
}

interface Props {
  gridCols: number;
  gridRows: number;
  svgWidth: number;
  svgHeight: number;
  color: string;
  zoom?: number;
  onCommit: (opts: { points: GridPoint[]; closed: boolean; color: string }) => void;
  onCancel: () => void;
}

export default function WallPainter({
  gridCols,
  gridRows,
  svgWidth,
  svgHeight,
  color,
  zoom = 1,
  onCommit,
  onCancel,
}: Props) {
  const [points, setPoints] = useState<GridPoint[]>([]);
  const [cursor, setCursor] = useState<GridPoint | null>(null);
  const [closable, setClosable] = useState(false);
  const [ortho, setOrtho] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && points.length >= 2) handleCommit(false);
      if (e.key === 'o' || e.key === 'O') setOrtho(v => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [points, onCancel]);

  function getSvgXY(e: React.MouseEvent): { px: number; py: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      px: (e.clientX - rect.left) / zoom,
      py: (e.clientY - rect.top) / zoom,
    };
  }

  function getSnappedPoint(e: React.MouseEvent): GridPoint {
    const { px, py } = getSvgXY(e);
    const raw = snapToGrid(px, py);
    const clamped: GridPoint = {
      x: Math.max(0, Math.min(gridCols, raw.x)),
      y: Math.max(0, Math.min(gridRows, raw.y)),
    };
    if (ortho && points.length > 0) {
      return orthogonalSnap(points[points.length - 1], clamped);
    }
    return clamped;
  }

  function handleMouseMove(e: React.MouseEvent) {
    const pt = getSnappedPoint(e);
    setCursor(pt);
    if (points.length > 0) {
      const first = points[0];
      const { sx: fx, sy: fy } = toSvg(first.x, first.y);
      const { px, py } = getSvgXY(e);
      setClosable(points.length >= 2 && dist(px, py, fx, fy) < SNAP_DIST * 2);
    } else {
      setClosable(false);
    }
  }

  function handleClick(e: React.MouseEvent) {
    if (e.detail >= 2) return;
    e.stopPropagation();
    const pt = getSnappedPoint(e);

    if (points.length >= 2 && closable) {
      handleCommit(true);
      return;
    }

    if (points.length > 0) {
      const last = points[points.length - 1];
      if (last.x === pt.x && last.y === pt.y) return;
    }

    setPoints(prev => [...prev, pt]);
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    handleCommit(false);
  }

  function handleCommit(closed: boolean) {
    if (points.length < 2) return;
    onCommit({ points, closed, color });
  }

  const allPts = cursor ? [...points, cursor] : points;
  const polylineStr = allPts.map(p => {
    const { sx, sy } = toSvg(p.x, p.y);
    return `${sx},${sy}`;
  }).join(' ');

  const firstPt = points.length > 0 ? toSvg(points[0].x, points[0].y) : null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-30 pointer-events-auto"
      style={{ width: svgWidth, height: svgHeight, cursor: closable ? 'cell' : 'crosshair' }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {allPts.length >= 2 && (
        <polyline
          points={polylineStr}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
          opacity="0.9"
        />
      )}

      {points.map((p, i) => {
        const { sx, sy } = toSvg(p.x, p.y);
        const isFirst = i === 0;
        return (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={isFirst && closable ? NODE_R + 3 : NODE_R}
            fill={isFirst && closable ? color : '#fff'}
            stroke={color}
            strokeWidth={2}
            style={{ transition: 'r 0.1s' }}
          />
        );
      })}

      {cursor && (
        <circle
          cx={toSvg(cursor.x, cursor.y).sx}
          cy={toSvg(cursor.x, cursor.y).sy}
          r={4}
          fill={closable ? color : '#fff'}
          stroke={color}
          strokeWidth={2}
          opacity={0.8}
        />
      )}

      {firstPt && <g style={{ display: 'none' }}><circle cx={firstPt.sx} cy={firstPt.sy} r={0} /></g>}
    </svg>
  );
}
