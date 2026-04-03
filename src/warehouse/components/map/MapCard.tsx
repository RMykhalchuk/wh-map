import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SwatchIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon, Cog6ToothIcon } from '@heroicons/react/20/solid';
import ColorPicker from '../common/ColorPicker';
import type { MapElement, ResizeDir } from '../../types';

export const CELL_SIZE = 30;
export const GRID_PADDING = 16;
const MIN_W = 5;
const MIN_H = 3;

const HANDLE_DIRS: ResizeDir[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

const HANDLE_CURSORS: Record<ResizeDir, string> = {
  n: 'n-resize', ne: 'ne-resize', e: 'e-resize', se: 'se-resize',
  s: 's-resize', sw: 'sw-resize', w: 'w-resize', nw: 'nw-resize',
};

const HANDLE_STYLES: Record<ResizeDir, React.CSSProperties> = {
  n:  { left: '50%', top: -5, transform: 'translateX(-50%)', width: 40, height: 10 },
  s:  { left: '50%', bottom: -5, transform: 'translateX(-50%)', width: 40, height: 10 },
  e:  { top: '50%', right: -5, transform: 'translateY(-50%)', width: 10, height: 40 },
  w:  { top: '50%', left: -5, transform: 'translateY(-50%)', width: 10, height: 40 },
  nw: { top: -5, left: -5, width: 14, height: 14 },
  ne: { top: -5, right: -5, width: 14, height: 14 },
  sw: { bottom: -5, left: -5, width: 14, height: 14 },
  se: { bottom: -5, right: -5, width: 14, height: 14 },
};

const HANDLE_AFTER_SIZES: Record<ResizeDir, React.CSSProperties> = {
  n:  { width: 20, height: 4 },
  s:  { width: 20, height: 4 },
  e:  { width: 4, height: 20 },
  w:  { width: 4, height: 20 },
  nw: { width: 8, height: 8 },
  ne: { width: 8, height: 8 },
  sw: { width: 8, height: 8 },
  se: { width: 8, height: 8 },
};

interface Props {
  mapElement: MapElement;
  label: string;
  childCount?: number;
  childLabel?: string;
  gridCols: number;
  gridRows: number;
  readonly: boolean;
  canNavigate?: boolean;
  zoom?: number;
  onUpdate: (updates: Partial<MapElement>) => void;
  onDelete?: () => void;
  onNavigate?: () => void;
  onExpandGrid?: (expansion: { cols?: number; rows?: number }, callback: (newCols: number, newRows: number) => void) => void;
}

export default function MapCard({
  mapElement,
  label,
  childCount,
  childLabel,
  gridCols,
  gridRows,
  readonly,
  canNavigate,
  zoom = 1,
  onUpdate,
  onDelete,
  onNavigate,
  onExpandGrid,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const paletteBtnRef = useRef<HTMLButtonElement>(null);

  const { grid_x, grid_y, grid_w, grid_h, color } = mapElement;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: grid_x * CELL_SIZE + GRID_PADDING,
    top: grid_y * CELL_SIZE + GRID_PADDING,
    width: grid_w * CELL_SIZE,
    height: grid_h * CELL_SIZE,
    backgroundColor: color,
    cursor: readonly ? (canNavigate ? 'pointer' : 'default') : (isDragging ? 'grabbing' : 'grab'),
    zIndex: isDragging || isResizing ? 100 : showPicker ? 200 : undefined,
    borderRadius: 6,
    overflow: showPicker ? 'visible' : 'hidden',
    transition: 'box-shadow 0.15s',
    boxShadow: isDragging || isResizing
      ? '0 8px 24px rgba(0,0,0,.22)'
      : '0 2px 8px rgba(0,0,0,.12)',
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readonly) return;
    if ((e.target as Element).closest('[data-resize]')) return;
    if ((e.target as Element).closest('[data-action]')) return;
    e.preventDefault();

    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = mapElement.grid_x;
    const startElY = mapElement.grid_y;

    let currentGridCols = gridCols;
    let currentGridRows = gridRows;
    let expandTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleExpand(direction: 'right' | 'bottom' | 'both') {
      if (expandTimer) return;
      expandTimer = setTimeout(() => {
        expandTimer = null;
        if (!onExpandGrid) return;
        const expansion: { cols?: number; rows?: number } = {};
        if (direction === 'right') expansion.cols = currentGridCols + 4;
        if (direction === 'bottom') expansion.rows = currentGridRows + 4;
        if (direction === 'both') { expansion.cols = currentGridCols + 4; expansion.rows = currentGridRows + 4; }
        onExpandGrid(expansion, (newCols, newRows) => {
          currentGridCols = newCols;
          currentGridRows = newRows;
        });
      }, 300);
    }

    function onMove(me: MouseEvent) {
      const dx = Math.round((me.clientX - startX) / (CELL_SIZE * zoom));
      const dy = Math.round((me.clientY - startY) / (CELL_SIZE * zoom));
      const newX = Math.max(0, Math.min(currentGridCols - mapElement.grid_w, startElX + dx));
      const newY = Math.max(0, Math.min(currentGridRows - mapElement.grid_h, startElY + dy));
      if (newX !== mapElement.grid_x || newY !== mapElement.grid_y) {
        onUpdate({ grid_x: newX, grid_y: newY });
      }
      const atRight = newX + mapElement.grid_w >= currentGridCols - 1;
      const atBottom = newY + mapElement.grid_h >= currentGridRows - 1;
      if (atRight && atBottom) scheduleExpand('both');
      else if (atRight) scheduleExpand('right');
      else if (atBottom) scheduleExpand('bottom');
      else { if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; } }
    }

    function onUp() {
      setIsDragging(false);
      if (expandTimer) clearTimeout(expandTimer);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [readonly, mapElement, gridCols, gridRows, zoom, onUpdate, onExpandGrid]);

  const handleResizeMouseDown = useCallback((dir: ResizeDir) => (e: React.MouseEvent) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = mapElement.grid_w;
    const startH = mapElement.grid_h;
    const startGX = mapElement.grid_x;
    const startGY = mapElement.grid_y;

    const affectsLeft = dir === 'w' || dir === 'nw' || dir === 'sw';
    const affectsRight = dir === 'e' || dir === 'ne' || dir === 'se';
    const affectsTop = dir === 'n' || dir === 'nw' || dir === 'ne';
    const affectsBottom = dir === 's' || dir === 'sw' || dir === 'se';

    function onMove(me: MouseEvent) {
      const rawDx = (me.clientX - startX) / (CELL_SIZE * zoom);
      const rawDy = (me.clientY - startY) / (CELL_SIZE * zoom);
      const dx = Math.round(rawDx);
      const dy = Math.round(rawDy);

      let newX = startGX, newY = startGY, newW = startW, newH = startH;

      if (affectsRight) newW = Math.max(MIN_W, Math.min(gridCols - startGX, startW + dx));
      if (affectsBottom) newH = Math.max(MIN_H, Math.min(gridRows - startGY, startH + dy));
      if (affectsLeft) {
        const maxDx = startW - MIN_W;
        const clampedDx = Math.max(-startGX, Math.min(maxDx, dx));
        newX = startGX + clampedDx;
        newW = startW - clampedDx;
      }
      if (affectsTop) {
        const maxDy = startH - MIN_H;
        const clampedDy = Math.max(-startGY, Math.min(maxDy, dy));
        newY = startGY + clampedDy;
        newH = startH - clampedDy;
      }

      const updates: Partial<MapElement> = {};
      if (newX !== mapElement.grid_x) updates.grid_x = newX;
      if (newY !== mapElement.grid_y) updates.grid_y = newY;
      if (newW !== mapElement.grid_w) updates.grid_w = newW;
      if (newH !== mapElement.grid_h) updates.grid_h = newH;
      if (Object.keys(updates).length > 0) onUpdate(updates);
    }

    function onUp() {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [readonly, mapElement, gridCols, gridRows, zoom, onUpdate]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!readonly || !canNavigate) return;
    e.stopPropagation();
    onNavigate?.();
  }, [readonly, canNavigate, onNavigate]);

  return (
    <div style={style} onMouseDown={handleMouseDown} onClick={handleClick}>
      {readonly ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '8px 10px', gap: 6 }}>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,.25)',
            textAlign: 'center',
            wordBreak: 'break-word',
            lineHeight: 1.3,
          }}>
            {label}
          </span>
          {childCount !== undefined && childCount !== null && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '3px 8px 3px 10px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.25)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              {childLabel ? `${childCount} ${childLabel}` : childCount}
              <ArrowRightIcon style={{ width: 10, height: 10 }} />
            </span>
          )}
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px 4px 8px',
            flexShrink: 0,
            backgroundColor: 'rgba(0,0,0,.15)',
            gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
              <Cog6ToothIcon style={{ width: 10, height: 10, color: 'rgba(255,255,255,.7)', flexShrink: 0 }} />
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,.2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <button
                ref={paletteBtnRef}
                type="button"
                style={{ background: 'none', border: 'none', padding: '2px 3px', borderRadius: 6, cursor: 'pointer', lineHeight: 1, color: 'rgba(255,255,255,.85)', transition: 'background 0.12s', display: 'flex', alignItems: 'center' }}
                data-action="true"
                title="Змінити колір"
                onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}
              >
                <SwatchIcon style={{ width: 10, height: 10 }} />
              </button>

              {canNavigate && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', padding: '2px 3px', borderRadius: 6, cursor: 'pointer', lineHeight: 1, color: 'rgba(255,255,255,.85)', transition: 'background 0.12s', display: 'flex', alignItems: 'center' }}
                  data-action="true"
                  title="Перейти до деталей"
                  onClick={e => { e.stopPropagation(); onNavigate?.(); }}
                >
                  <ArrowRightIcon style={{ width: 10, height: 10 }} />
                </button>
              )}

              <button
                type="button"
                style={{ background: 'none', border: 'none', padding: '2px 3px', borderRadius: 6, cursor: 'pointer', lineHeight: 1, color: 'rgba(255,255,255,.85)', transition: 'background 0.12s', display: 'flex', alignItems: 'center' }}
                data-action="true"
                title="Видалити з мапи"
                onClick={e => { e.stopPropagation(); onDelete?.(); }}
              >
                <TrashIcon style={{ width: 10, height: 10 }} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>
              {grid_w}×{grid_h}
            </span>
          </div>
        </>
      )}

      {!readonly && HANDLE_DIRS.map(dir => (
        <div
          key={dir}
          data-resize="true"
          style={{
            position: 'absolute',
            zIndex: 10,
            opacity: isResizing ? 1 : 0,
            transition: 'opacity 0.15s',
            cursor: HANDLE_CURSORS[dir],
            ...HANDLE_STYLES[dir],
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => { if (!isResizing) e.currentTarget.style.opacity = '0'; }}
          onMouseDown={handleResizeMouseDown(dir)}
        >
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(0,0,0,0.25)',
            borderRadius: 6,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            ...HANDLE_AFTER_SIZES[dir],
          }} />
        </div>
      ))}

      {showPicker && createPortal(
        <ColorPicker
          value={color}
          anchorRef={paletteBtnRef}
          onSelect={(newColor) => { onUpdate({ color: newColor }); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />,
        document.body
      )}
    </div>
  );
}
