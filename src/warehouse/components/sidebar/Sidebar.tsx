import React, { useState, useEffect } from 'react';
import {
  BuildingOffice2Icon,
  Squares2X2Icon,
  MapPinIcon,
  ListBulletIcon,
  SquaresPlusIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';
import type { NavLevel } from '../../types';

const LEVEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  locations: BuildingOffice2Icon,
  zones: Squares2X2Icon,
  sectors: MapPinIcon,
  rows: ListBulletIcon,
};

const WALL_COLORS = [
  '#475569', '#1e293b', '#ef4444', '#f97316', '#3b82f6', '#10b981',
  '#eab308', '#ec4899', '#06b6d4', '#84cc16',
];

interface Item {
  id: string;
  name: string;
  color: string;
}

interface Props {
  level: NavLevel;
  items: Item[];
  placedIds: Set<string>;
  onDragStart: (item: Item) => void;
  onItemClick: (item: Item) => void;
  drawingWall: boolean;
  wallColor: string;
  onToggleDrawWall: () => void;
  onWallColorChange: (color: string) => void;
  onAddBlock: () => void;
}

export default function Sidebar({
  level,
  items,
  placedIds,
  onDragStart,
  onItemClick,
  drawingWall,
  wallColor,
  onToggleDrawWall,
  onWallColorChange,
  onAddBlock,
}: Props) {
  const intl = useIntl();
  const unplaced = items.filter(i => !placedIds.has(i.id));
  const placed = items.filter(i => placedIds.has(i.id));
  const [showWallColors, setShowWallColors] = useState(false);

  useEffect(() => {
    if (!showWallColors) return;
    function onClickOut(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest('[data-wall-color-picker]')) setShowWallColors(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [showWallColors]);

  return (
    <div className="w-[220px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4">
        {unplaced.length === 0 && placed.length === 0 ? (
          <div className="text-center text-slate-400 text-[13px] py-4">
            {intl.formatMessage({ id: 'sidebar.no_items' })}
          </div>
        ) : (
          <>
            {unplaced.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-semibold text-slate-500 mb-1 px-1">
                  {intl.formatMessage({ id: 'sidebar.unplaced' })}
                </div>
                {unplaced.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isPlaced={false}
                    onDragStart={onDragStart}
                    onClick={() => onItemClick(item)}
                  />
                ))}
              </div>
            )}

            {placed.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-semibold text-slate-500 mb-1 px-1">
                  {intl.formatMessage({ id: 'sidebar.placed' })}
                </div>
                {placed.map(item => (
                  <ItemRow key={item.id} item={item} isPlaced={true} onDragStart={onDragStart} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold text-slate-500 mb-1 px-1">
            {intl.formatMessage({ id: 'sidebar.elements' })}
          </div>

          <button
            type="button"
            className="w-full flex justify-start items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-[13px] font-medium text-slate-700 cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-45 disabled:pointer-events-none"
            onClick={onAddBlock}
            disabled={drawingWall}
          >
            <SquaresPlusIcon className="w-4 h-4 text-slate-500" />
            {intl.formatMessage({ id: 'sidebar.add_block' })}
          </button>

          <div className="relative w-full" data-wall-color-picker>
            <div
              className={`flex w-full rounded-md border overflow-hidden transition-all ${
                drawingWall
                  ? 'bg-slate-800 border-slate-800'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                className={`flex-1 flex items-center gap-2 px-3 py-2 text-[13px] font-medium cursor-pointer transition-colors ${
                  drawingWall ? 'text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={onToggleDrawWall}
                title={drawingWall ? intl.formatMessage({ id: 'sidebar.cancel_draw' }) : intl.formatMessage({ id: 'sidebar.draw_walls' })}
              >
                {drawingWall ? <XMarkIcon className="w-4 h-4" /> : <PencilSquareIcon className="w-4 h-4 text-slate-500" />}
                {drawingWall
                  ? intl.formatMessage({ id: 'sidebar.cancel_draw' })
                  : intl.formatMessage({ id: 'sidebar.draw_walls' })}
              </button>
              {!drawingWall && (
                <button
                  type="button"
                  className="flex-shrink-0 w-9 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setShowWallColors(v => !v)}
                  title={intl.formatMessage({ id: 'wall.color_title' })}
                >
                  <span
                    className="w-4 h-4 rounded-md border border-slate-300"
                    style={{ backgroundColor: wallColor }}
                  />
                </button>
              )}
            </div>
            {showWallColors && (
              <div className="absolute top-full left-0 mt-1.5 grid grid-cols-5 gap-1.5 p-2 bg-white border border-slate-200 rounded-md shadow-xl z-[9000]">
                {WALL_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-md cursor-pointer transition-all hover:scale-115 p-0 ${wallColor === c ? 'scale-110' : ''}`}
                    style={{
                      backgroundColor: c,
                      border: wallColor === c ? '2.5px solid #0f172a' : '2.5px solid transparent',
                    }}
                    onClick={() => { onWallColorChange(c); setShowWallColors(false); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ItemRowProps {
  item: Item;
  isPlaced: boolean;
  onDragStart?: (item: Item) => void;
  onClick?: () => void;
}

function ItemRow({ item, isPlaced, onDragStart, onClick }: ItemRowProps) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md border select-none transition-all ${
        isPlaced
          ? 'border-slate-200 bg-white cursor-default'
          : 'border-slate-200 bg-white cursor-grab hover:border-slate-300 hover:bg-slate-50 active:cursor-grabbing'
      }`}
      draggable={!isPlaced}
      onDragStart={!isPlaced ? (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', String(item.id));
        onDragStart?.(item);
      } : undefined}
      onClick={!isPlaced ? onClick : undefined}
    >
      <div
        className="w-3.5 h-3.5 rounded flex-shrink-0"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-[13px] font-medium flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-slate-700">
        {item.name}
      </span>
      {isPlaced ? (
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
      ) : (
        <span className="text-slate-400 text-[16px] font-light leading-none flex-shrink-0">+</span>
      )}
    </div>
  );
}
