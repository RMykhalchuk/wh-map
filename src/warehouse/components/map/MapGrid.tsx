import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { MinusIcon, PlusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { ArrowsPointingOutIcon } from '@heroicons/react/20/solid';
import { useIntl } from 'react-intl';
import MapCard, { CELL_SIZE, GRID_PADDING } from './MapCard';
import CustomObjectCard from './CustomObjectCard';
import AddBlockDialog from '../dialogs/AddBlockDialog';
import WallPainter from './WallPainter';
import WallOverlay from './WallOverlay';
import type { MapElement, CustomElement, WallElement, GridItem, GridPoint } from '../../types';

const DEFAULT_COLS = 16;
const DEFAULT_ROWS = 12;
const MIN_COLS = 4;
const MIN_ROWS = 4;
const MAX_COLS = 200;
const MAX_ROWS = 100;
const STORAGE_PREFIX = 'wh_grid_size';
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const ZOOM_DEFAULT = 1;

function loadGridSize(navKey: string): { cols: number; rows: number } {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${navKey}`);
    if (raw) {
      const { cols, rows } = JSON.parse(raw);
      return {
        cols: Math.min(MAX_COLS, Math.max(MIN_COLS, cols)),
        rows: Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows)),
      };
    }
  } catch (_) {}
  return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
}

function saveGridSize(navKey: string, cols: number, rows: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${navKey}`, JSON.stringify({ cols, rows }));
  } catch (_) {}
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function clampZoom(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

interface Props {
  navKey: string;
  items: GridItem[];
  customItems: CustomElement[];
  wallItems: WallElement[];
  readonly: boolean;
  drawingWall: boolean;
  onDrop: (elementId: string, gridX: number, gridY: number) => void;
  onUpdate: (id: string, updates: Partial<MapElement>) => void;
  onDelete: (id: string) => void;
  onNavigate: (elementId: string) => void;
  onCustomAdd: (opts: { type: string; label: string; color: string }) => void;
  onCustomUpdate: (id: string, updates: Partial<CustomElement>) => void;
  onCustomDelete: (id: string) => void;
  onWallAdd: (opts: { points: GridPoint[]; closed: boolean; color: string }) => void;
  onWallUpdate: (id: string, updates: Partial<WallElement>) => void;
  onWallDelete: (id: string) => void;
  onWallCommit: () => void;
  onWallCancel: () => void;
  wallColor: string;
  showBlockDialog: boolean;
  onBlockDialogClose: () => void;
}

export default function MapGrid({
  navKey, items, customItems, wallItems, readonly, drawingWall,
  onDrop, onUpdate, onDelete, onNavigate,
  onCustomAdd, onCustomUpdate, onCustomDelete,
  onWallAdd, onWallUpdate, onWallDelete, onWallCommit, onWallCancel,
  wallColor, showBlockDialog, onBlockDialogClose,
}: Props) {
  const intl = useIntl();
  const [gridSize, setGridSize] = useState(() => loadGridSize(navKey));
  const [resizing, setResizing] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const manualSizeRef = useRef(loadGridSize(navKey));
  const zoomRef = useRef(ZOOM_DEFAULT);
  const navKeyRef = useRef(navKey);

  const { cols: gridCols, rows: gridRows } = gridSize;
  const svgWidth = gridCols * CELL_SIZE + GRID_PADDING * 2;
  const svgHeight = gridRows * CELL_SIZE + GRID_PADDING * 2;

  function computeFitSize(): { cols: number; rows: number } {
    if (!areaRef.current) return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
    const availW = areaRef.current.clientWidth - 80;
    const availH = areaRef.current.clientHeight - 80;
    const cols = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.floor((availW - GRID_PADDING * 2) / CELL_SIZE)));
    const rows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.floor((availH - GRID_PADDING * 2) / CELL_SIZE)));
    return { cols, rows };
  }

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const stored = localStorage.getItem(`${STORAGE_PREFIX}:${navKey}`);
    if (stored) return;

    const tryFit = () => {
      if (area.clientWidth > 0 && area.clientHeight > 0) {
        const initial = computeFitSize();
        setGridSize(initial);
        manualSizeRef.current = initial;
      }
    };

    tryFit();
    if (area.clientWidth === 0 || area.clientHeight === 0) {
      const ro = new ResizeObserver(() => {
        if (area.clientWidth > 0 && area.clientHeight > 0) {
          ro.disconnect();
          const initial = computeFitSize();
          setGridSize(initial);
          manualSizeRef.current = initial;
        }
      });
      ro.observe(area);
      return () => ro.disconnect();
    }
  }, []);

  useEffect(() => {
    navKeyRef.current = navKey;
    const stored = localStorage.getItem(`${STORAGE_PREFIX}:${navKey}`);
    if (!stored) {
      const area = areaRef.current;
      if (area && area.clientWidth > 0 && area.clientHeight > 0) {
        const initial = computeFitSize();
        setGridSize(initial);
        manualSizeRef.current = initial;
      }
    } else {
      const loaded = loadGridSize(navKey);
      setGridSize(loaded);
      manualSizeRef.current = loaded;
    }
    setZoom(ZOOM_DEFAULT);
    zoomRef.current = ZOOM_DEFAULT;
  }, [navKey]);

  useEffect(() => {
    saveGridSize(navKeyRef.current, gridCols, gridRows);
  }, [gridCols, gridRows]);

  function computeMinFit() {
    let minCols = MIN_COLS;
    let minRows = MIN_ROWS;
    for (const { mapElement: el } of items) {
      minCols = Math.max(minCols, el.grid_x + el.grid_w);
      minRows = Math.max(minRows, el.grid_y + el.grid_h);
    }
    for (const el of (customItems || [])) {
      minCols = Math.max(minCols, el.grid_x + el.grid_w);
      minRows = Math.max(minRows, el.grid_y + el.grid_h);
    }
    return { minCols, minRows };
  }

  useEffect(() => {
    if (resizing) return;
    const { minCols, minRows } = computeMinFit();
    const targetCols = Math.max(manualSizeRef.current.cols, minCols);
    const targetRows = Math.max(manualSizeRef.current.rows, minRows);
    setGridSize(prev => {
      if (prev.cols === targetCols && prev.rows === targetRows) return prev;
      return { cols: targetCols, rows: targetRows };
    });
  }, [items, customItems]);

  const applyZoom = useCallback((delta: number, pivotX?: number, pivotY?: number) => {
    const area = areaRef.current;
    const wrap = wrapRef.current;
    if (!area || !wrap) return;

    const prevZoom = zoomRef.current;
    const newZoom = clampZoom(prevZoom + delta);
    if (newZoom === prevZoom) return;

    const areaRect = area.getBoundingClientRect();
    const px = (pivotX !== undefined ? pivotX : areaRect.left + areaRect.width / 2) - areaRect.left + area.scrollLeft;
    const py = (pivotY !== undefined ? pivotY : areaRect.top + areaRect.height / 2) - areaRect.top + area.scrollTop;

    const ratio = newZoom / prevZoom;
    area.scrollLeft = px * ratio - (px - area.scrollLeft);
    area.scrollTop = py * ratio - (py - area.scrollTop);

    zoomRef.current = newZoom;
    setZoom(newZoom);
  }, []);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.001 * (e.deltaMode === 1 ? 20 : 1);
      applyZoom(delta * 2, e.clientX, e.clientY);
    }
    area.addEventListener('wheel', onWheel, { passive: false });
    return () => area.removeEventListener('wheel', onWheel);
  }, [applyZoom]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const SCROLL_STEP = 80;
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); area.scrollLeft -= SCROLL_STEP; }
      else if (e.key === 'ArrowRight') { e.preventDefault(); area.scrollLeft += SCROLL_STEP; }
      else if (e.key === 'ArrowUp') { e.preventDefault(); area.scrollTop -= SCROLL_STEP; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); area.scrollTop += SCROLL_STEP; }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function hasCollision(excludeId: string, x: number, y: number, w: number, h: number) {
    const collidesWithMapElements = items.some(({ mapElement: el }) => {
      if (el.id === excludeId) return false;
      return rectsOverlap(x, y, w, h, el.grid_x, el.grid_y, el.grid_w, el.grid_h);
    });
    const collidesWithCustom = (customItems || []).some(el =>
      rectsOverlap(x, y, w, h, el.grid_x, el.grid_y, el.grid_w, el.grid_h)
    );
    return collidesWithMapElements || collidesWithCustom;
  }

  function hasCollisionForNew(x: number, y: number, w: number, h: number) {
    return items.some(({ mapElement: el }) =>
      rectsOverlap(x, y, w, h, el.grid_x, el.grid_y, el.grid_w, el.grid_h)
    ) || (customItems || []).some(el =>
      rectsOverlap(x, y, w, h, el.grid_x, el.grid_y, el.grid_w, el.grid_h)
    );
  }

  function hasCustomCollision(excludeId: string, x: number, y: number, w: number, h: number) {
    return items.some(({ mapElement: el }) =>
      rectsOverlap(x, y, w, h, el.grid_x, el.grid_y, el.grid_w, el.grid_h)
    ) || (customItems || []).some(el => {
      if (el.id === excludeId) return false;
      return rectsOverlap(x, y, w, h, el.grid_x, el.grid_y, el.grid_w, el.grid_h);
    });
  }

  function startResize(direction: 'right' | 'bottom' | 'both', e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startCols = gridCols;
    const startRows = gridRows;

    document.body.style.cursor = direction === 'right' ? 'ew-resize' : direction === 'bottom' ? 'ns-resize' : 'nwse-resize';
    document.body.style.userSelect = 'none';

    let currentCols = startCols;
    let currentRows = startRows;

    function onMove(me: MouseEvent) {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      const { minCols, minRows } = computeMinFit();

      if (direction === 'right' || direction === 'both') {
        currentCols = Math.max(minCols, Math.min(MAX_COLS, Math.round(startCols + dx / (CELL_SIZE * zoomRef.current))));
      }
      if (direction === 'bottom' || direction === 'both') {
        currentRows = Math.max(minRows, Math.min(MAX_ROWS, Math.round(startRows + dy / (CELL_SIZE * zoomRef.current))));
      }

      setGridSize({ cols: currentCols, rows: currentRows });

      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        setTooltip({ x: rect.width - 80, y: rect.height - 36, label: `${currentCols} × ${currentRows}` });
      }
    }

    function onUp() {
      setResizing(false);
      setTooltip(null);
      manualSizeRef.current = { cols: currentCols, rows: currentRows };
      saveGridSize(navKeyRef.current, currentCols, currentRows);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const dragExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDragOver(e: React.DragEvent) {
    if (readonly || drawingWall) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';

    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomRef.current - GRID_PADDING;
    const y = (e.clientY - rect.top) / zoomRef.current - GRID_PADDING;
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);

    const atRight = gridX >= gridCols - 2;
    const atBottom = gridY >= gridRows - 2;

    if (atRight || atBottom) {
      if (!dragExpandTimer.current) {
        dragExpandTimer.current = setTimeout(() => {
          dragExpandTimer.current = null;
          setGridSize(prev => ({
            cols: atRight ? Math.min(MAX_COLS, prev.cols + 4) : prev.cols,
            rows: atBottom ? Math.min(MAX_ROWS, prev.rows + 4) : prev.rows,
          }));
        }, 300);
      }
    } else {
      if (dragExpandTimer.current) { clearTimeout(dragExpandTimer.current); dragExpandTimer.current = null; }
    }
  }

  function handleDrop(e: React.DragEvent) {
    if (readonly || drawingWall) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragExpandTimer.current) { clearTimeout(dragExpandTimer.current); dragExpandTimer.current = null; }
    const elementId = e.dataTransfer.getData('text/plain');
    if (!elementId) return;
    const rect = gridRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomRef.current - GRID_PADDING;
    const y = (e.clientY - rect.top) / zoomRef.current - GRID_PADDING;
    const gridX = Math.max(0, Math.min(gridCols - 3, Math.floor(x / CELL_SIZE)));
    const gridY = Math.max(0, Math.min(gridRows - 2, Math.floor(y / CELL_SIZE)));
    if (hasCollisionForNew(gridX, gridY, 3, 2)) return;
    onDrop(elementId, gridX, gridY);
  }

  function handleExpandGrid(expansion: { cols?: number; rows?: number }, callback: (newCols: number, newRows: number) => void) {
    setGridSize(prev => {
      const newCols = expansion.cols !== undefined ? Math.min(MAX_COLS, expansion.cols) : prev.cols;
      const newRows = expansion.rows !== undefined ? Math.min(MAX_ROWS, expansion.rows) : prev.rows;
      if (callback) setTimeout(() => callback(newCols, newRows), 0);
      return { cols: newCols, rows: newRows };
    });
  }

  function handleBlockConfirm({ label, color }: { label: string; color: string }) {
    onBlockDialogClose?.();
    onCustomAdd({ type: 'block', label, color });
  }

  function handleWallCommit(opts: { points: GridPoint[]; closed: boolean; color: string }) {
    onWallAdd(opts);
    onWallCommit?.();
  }

  const isEmpty = items.length === 0 && (!customItems || customItems.length === 0) && (!wallItems || wallItems.length === 0);
  const zoomPct = Math.round(zoom * 100);

  return (
    <div ref={areaRef} className="relative flex-1 overflow-auto bg-white p-6" onDragOver={handleDragOver} onDrop={handleDrop}>
      {drawingWall && !readonly && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-md text-[11px] text-amber-800 font-medium max-w-lg">
            <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
            {intl.formatMessage({ id: 'map.drawing_hint' })}
          </div>
        </div>
      )}

      {showBlockDialog && (
        <AddBlockDialog
          onConfirm={handleBlockConfirm}
          onCancel={() => onBlockDialogClose?.()}
        />
      )}

      <div style={{ minWidth: svgWidth * zoom + 32, minHeight: svgHeight * zoom + 32, width: '100%', position: 'relative' }}>
        <div
          ref={wrapRef}
          className="relative inline-block"
          style={{ paddingRight: 16, paddingBottom: 16, transformOrigin: 'top left', transform: `scale(${zoom})` }}
        >
          <div
            ref={gridRef}
            className={`relative bg-white flex-shrink-0 ${drawingWall ? '[cursor:crosshair!important]' : ''}`}
            style={{
              width: svgWidth,
              height: svgHeight,
              backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
              backgroundPosition: `${GRID_PADDING}px ${GRID_PADDING}px`,
              boxShadow: resizing ? '0 0 0 2px rgba(13,110,253,0.25)' : undefined,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isEmpty && !drawingWall && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  {readonly ? (
                    <p className="text-slate-400 text-[13px] m-0">{intl.formatMessage({ id: 'map.empty_view' })}</p>
                  ) : (
                    <p className="text-slate-400 text-[13px] font-medium m-0 text-center max-w-[200px] leading-snug">{intl.formatMessage({ id: 'map.empty_edit' })}<br/><span className="text-slate-300 text-[11px]">{intl.formatMessage({ id: 'map.empty_edit_hint' })}</span></p>
                  )}
                </div>
              </div>
            )}

            <WallOverlay
              walls={wallItems || []}
              gridCols={gridCols}
              gridRows={gridRows}
              svgWidth={svgWidth}
              svgHeight={svgHeight}
              readonly={readonly || drawingWall}
              onUpdate={onWallUpdate}
              onDelete={onWallDelete}
            />

            {(customItems || []).map(el => (
              <CustomObjectCard
                key={el.id}
                element={el}
                gridCols={gridCols}
                gridRows={gridRows}
                readonly={readonly || drawingWall}
                zoom={zoom}
                onUpdate={(updates) => {
                  const newX = updates.grid_x ?? el.grid_x;
                  const newY = updates.grid_y ?? el.grid_y;
                  const newW = updates.grid_w ?? el.grid_w;
                  const newH = updates.grid_h ?? el.grid_h;
                  if (hasCustomCollision(el.id, newX, newY, newW, newH)) return;
                  onCustomUpdate(el.id, updates);
                }}
                onDelete={() => onCustomDelete(el.id)}
              />
            ))}

            {items.map(({ mapElement, label, childCount, childLabel }) => (
              <MapCard
                key={mapElement.id}
                mapElement={mapElement}
                label={label}
                childCount={childCount}
                childLabel={childLabel}
                gridCols={gridCols}
                gridRows={gridRows}
                readonly={readonly || drawingWall}
                canNavigate={true}
                zoom={zoom}
                onUpdate={(updates) => {
                  const cur = items.find(i => i.mapElement.id === mapElement.id)?.mapElement ?? mapElement;
                  const newX = updates.grid_x ?? cur.grid_x;
                  const newY = updates.grid_y ?? cur.grid_y;
                  const newW = updates.grid_w ?? cur.grid_w;
                  const newH = updates.grid_h ?? cur.grid_h;
                  if (hasCollision(mapElement.id, newX, newY, newW, newH)) return;
                  onUpdate(mapElement.id, updates);
                }}
                onDelete={() => onDelete(mapElement.id)}
                onNavigate={() => onNavigate(mapElement.element_id)}
                onExpandGrid={handleExpandGrid}
              />
            ))}

            {drawingWall && (
              <WallPainter
                gridCols={gridCols}
                gridRows={gridRows}
                svgWidth={svgWidth}
                svgHeight={svgHeight}
                color={wallColor}
                zoom={zoom}
                onCommit={handleWallCommit}
                onCancel={onWallCancel}
              />
            )}
          </div>

          {!readonly && (
            <>
              <div
                className="absolute z-20 transition-opacity top-3 -right-1.5 bottom-3 w-3 cursor-ew-resize flex items-center justify-center group"
                onMouseDown={e => startResize('right', e)}
              >
                <div className="w-1 h-10 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-all" />
              </div>
              <div
                className="absolute z-20 transition-opacity left-3 -bottom-1.5 h-3 right-3 cursor-ns-resize flex items-center justify-center group"
                onMouseDown={e => startResize('bottom', e)}
              >
                <div className="h-1 w-15 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-all" />
              </div>
              <div
                className="absolute z-20 -right-2.5 -bottom-2.5 w-5.5 h-5.5 bg-white border border-slate-200 rounded-md cursor-nwse-resize flex items-center justify-center shadow-sm text-slate-400 hover:bg-blue-500 hover:border-blue-500 hover:text-white hover:shadow-md transition-all"
                style={{ width: 22, height: 22, right: -10, bottom: -10 }}
                onMouseDown={e => startResize('both', e)}
              >
                <ArrowsPointingOutIcon className="w-3 h-3" />
              </div>
            </>
          )}

          {tooltip && (
            <div
              className="absolute bg-slate-900 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-30 shadow-md"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {tooltip.label}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-2 py-1 z-50">
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 text-base cursor-pointer transition-all hover:text-slate-900 disabled:opacity-35 disabled:cursor-default flex-shrink-0"
          title={intl.formatMessage({ id: 'map.zoom_out' })}
          onClick={() => applyZoom(-ZOOM_STEP)}
          disabled={zoom <= ZOOM_MIN}
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </button>
        <button
          className="min-w-[44px] h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-600 text-[12px] font-medium tabular-nums cursor-pointer transition-all hover:text-slate-900 flex-shrink-0"
          title={intl.formatMessage({ id: 'map.zoom_reset' })}
          onClick={() => { zoomRef.current = ZOOM_DEFAULT; setZoom(ZOOM_DEFAULT); }}
        >
          {zoomPct}%
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center border-none bg-transparent rounded text-slate-500 text-base cursor-pointer transition-all hover:text-slate-900 disabled:opacity-35 disabled:cursor-default flex-shrink-0"
          title={intl.formatMessage({ id: 'map.zoom_in' })}
          onClick={() => applyZoom(ZOOM_STEP)}
          disabled={zoom >= ZOOM_MAX}
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
