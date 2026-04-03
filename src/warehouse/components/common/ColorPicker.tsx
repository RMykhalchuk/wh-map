import React, { useEffect, useRef } from 'react';

const PRESET_COLORS = [
  '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE',
  '#10B981', '#34D399', '#6EE7B7', '#D1FAE5',
  '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2',
  '#F59E0B', '#FCD34D', '#FDE68A', '#FEF3C7',
  '#06B6D4', '#22D3EE', '#67E8F9', '#CFFAFE',
  '#64748B', '#94A3B8', '#CBD5E1', '#F1F5F9',
];

interface Props {
  value: string;
  anchorRef?: React.RefObject<HTMLElement | null>;
  position?: { top: number; left: number };
  onSelect: (color: string) => void;
  onClose: () => void;
}

export default function ColorPicker({ value, anchorRef, position, onSelect, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function computePosition() {
      if (!wrapRef.current) return;
      const pick = wrapRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pw = pick.width || 208;
      const ph = pick.height || 200;

      let top: number, left: number;
      if (position) {
        top = position.top + 4;
        left = position.left - pw;
      } else if (anchorRef?.current) {
        const btn = anchorRef.current.getBoundingClientRect();
        top = btn.bottom + 4;
        left = btn.right - pw;
      } else return;

      if (left < 4) left = 4;
      if (left + pw > vw - 4) left = vw - pw - 4;
      if (top + ph > vh - 4) top = (position ? position.top : (anchorRef!.current!.getBoundingClientRect().top)) - ph - 4;
      wrapRef.current.style.top = top + 'px';
      wrapRef.current.style.left = left + 'px';
    }
    requestAnimationFrame(computePosition);
  }, [anchorRef, position]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return;
      if (anchorRef?.current && anchorRef.current.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={wrapRef}
      className="fixed z-[9999] bg-white rounded-md shadow-2xl border border-slate-200 p-3 w-52"
      data-action="true"
    >
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            className="w-8 h-8 rounded-md cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
            style={{
              backgroundColor: color,
              border: value === color ? '2px solid #1e293b' : '1px solid rgba(0,0,0,0.1)',
              transform: value === color ? 'scale(1.1)' : undefined,
            }}
            onClick={() => onSelect(color)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <input
          type="color"
          className="w-8 h-8 rounded cursor-pointer border border-slate-200 p-0.5"
          value={value}
          onChange={e => onSelect(e.target.value)}
        />
        <input
          type="text"
          className="flex-1 text-xs font-mono border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="#000000"
          defaultValue={value}
          onInput={e => {
            const val = (e.target as HTMLInputElement).value;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) onSelect(val);
          }}
        />
      </div>
    </div>
  );
}
