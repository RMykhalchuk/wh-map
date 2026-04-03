import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SwatchIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ColorPicker from '../common/ColorPicker';
import { CELL_SIZE, GRID_PADDING } from './MapCard';
import type { CustomElement, ResizeDir } from '../../types';

const MIN_W = 1;
const MIN_H = 1;

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
  element: CustomElement;
  gridCols: number;
  gridRows: number;
  readonly: boolean;
  zoom?: number;
  onUpdate: (updates: Partial<CustomElement>) => void;
  onDelete: () => void;
}

export default function CustomObjectCard({
  element,
  gridCols,
  gridRows,
  readonly,
  zoom = 1,
  onUpdate,
  onDelete,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const paletteBtnRef = useRef<HTMLButtonElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const { grid_x, grid_y, grid_w, grid_h, color, label, object_type } = element;
  const isWall = object_type === 'wall';

  const style: React.CSSProperties = {
    position: 'absolute',
    left: grid_x * CELL_SIZE + GRID_PADDING,
    top: grid_y * CELL_SIZE + GRID_PADDING,
    width: grid_w * CELL_SIZE,
    height: grid_h * CELL_SIZE,
    cursor: readonly ? 'default' : isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging || isResizing ? 50 : showPicker ? 200 : 10,
    borderRadius: 6,
    border: isWall ? `2px solid ${color}` : `2px solid ${color}`,
    backgroundColor: isWall ? color : color + '28',
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.15s, border-color 0.15s',
    boxShadow: isDragging || isResizing
      ? '0 8px 24px rgba(0,0,0,.22)'
      : isWall ? '0 2px 6px rgba(0,0,0,.25)' : 'none',
    overflow: 'hidden',
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readonly) return;
    if ((e.target as Element).closest('[data-resize]')) return;
    if ((e.target as Element).closest('[data-action]')) return;
    if ((e.target as Element).closest('[data-label-input]')) return;
    e.preventDefault();

    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = element.grid_x;
    const startElY = element.grid_y;

    function onMove(me: MouseEvent) {
      const dx = Math.round((me.clientX - startX) / (CELL_SIZE * zoom));
      const dy = Math.round((me.clientY - startY) / (CELL_SIZE * zoom));
      const newX = Math.max(0, Math.min(gridCols - element.grid_w, startElX + dx));
      const newY = Math.max(0, Math.min(gridRows - element.grid_h, startElY + dy));
      if (newX !== element.grid_x || newY !== element.grid_y) {
        onUpdate({ grid_x: newX, grid_y: newY });
      }
    }

    function onUp() {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [readonly, element, gridCols, gridRows, zoom, onUpdate]);

  const handleResizeMouseDown = useCallback((dir: ResizeDir) => (e: React.MouseEvent) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = element.grid_w;
    const startH = element.grid_h;
    const startGX = element.grid_x;
    const startGY = element.grid_y;

    const affectsLeft = dir === 'w' || dir === 'nw' || dir === 'sw';
    const affectsRight = dir === 'e' || dir === 'ne' || dir === 'se';
    const affectsTop = dir === 'n' || dir === 'nw' || dir === 'ne';
    const affectsBottom = dir === 's' || dir === 'sw' || dir === 'se';

    function onMove(me: MouseEvent) {
      const dx = Math.round((me.clientX - startX) / (CELL_SIZE * zoom));
      const dy = Math.round((me.clientY - startY) / (CELL_SIZE * zoom));

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

      const updates: Partial<CustomElement> = {};
      if (newX !== element.grid_x) updates.grid_x = newX;
      if (newY !== element.grid_y) updates.grid_y = newY;
      if (newW !== element.grid_w) updates.grid_w = newW;
      if (newH !== element.grid_h) updates.grid_h = newH;
      if (Object.keys(updates).length > 0) onUpdate(updates);
    }

    function onUp() {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [readonly, element, gridCols, gridRows, zoom, onUpdate]);

  function startEditLabel(e: React.MouseEvent) {
    if (isWall) return;
    e.stopPropagation();
    setEditingLabel(true);
    setTimeout(() => labelInputRef.current?.select(), 0);
  }

  function commitLabel(val: string) {
    setEditingLabel(false);
    const trimmed = val.trim();
    if (trimmed !== label) onUpdate({ label: trimmed });
  }

  return (
    <div
      style={style}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!readonly && (hovered || isDragging || isResizing) && (
        <div
          data-action="true"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 10,
            background: 'rgba(15,23,42,.65)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            padding: '2px 3px',
          }}
        >
          <button
            ref={paletteBtnRef}
            type="button"
            style={{ background: 'none', border: 'none', padding: '3px 4px', borderRadius: 6, cursor: 'pointer', lineHeight: 1, fontSize: 12, color: 'rgba(255,255,255,.85)', transition: 'background 0.12s' }}
            data-action="true"
            title="Змінити колір"
            onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <SwatchIcon className="w-3 h-3" />
          </button>
          {!isWall && (
            <button
              type="button"
              style={{ background: 'none', border: 'none', padding: '3px 4px', borderRadius: 6, cursor: 'pointer', lineHeight: 1, fontSize: 12, color: 'rgba(255,255,255,.85)', transition: 'background 0.12s' }}
              data-action="true"
              title="Перейменувати"
              onClick={startEditLabel}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <PencilIcon className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            style={{ background: 'none', border: 'none', padding: '3px 4px', borderRadius: 6, cursor: 'pointer', lineHeight: 1, fontSize: 12, color: 'rgba(255,255,255,.85)', transition: 'background 0.12s' }}
            data-action="true"
            title="Видалити"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.5)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {!isWall && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, overflow: 'hidden' }}>
          {editingLabel ? (
            <input
              ref={labelInputRef}
              data-label-input="true"
              style={{
                width: 'calc(100% - 8px)',
                background: 'rgba(255,255,255,.92)',
                border: `1.5px solid ${color}`,
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#1e293b',
                outline: 'none',
                textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,.1)',
              }}
              defaultValue={label}
              onBlur={e => commitLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitLabel((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setEditingLabel(false);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                letterSpacing: '0.01em',
                fontStyle: !label ? 'italic' : undefined,
                opacity: !label ? 0.45 : undefined,
              }}
              onDoubleClick={!readonly ? startEditLabel : undefined}
            >
              {label || 'Без назви'}
            </span>
          )}
        </div>
      )}

      {!readonly && HANDLE_DIRS.map(dir => (
        <div
          key={dir}
          data-resize="true"
          style={{
            position: 'absolute',
            zIndex: 10,
            opacity: isResizing || hovered ? 1 : 0,
            transition: 'opacity 0.15s',
            cursor: HANDLE_CURSORS[dir],
            ...HANDLE_STYLES[dir],
          }}
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
