import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { PlusIcon, EyeDropperIcon } from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

const PRESET_COLORS = [
  '#3B82F6', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#2563EB', '#EC4899', '#64748B',
];

interface Props {
  onConfirm: (opts: { label: string; color: string }) => void;
  onCancel: () => void;
}

export default function AddBlockDialog({ onConfirm, onCancel }: Props) {
  const intl = useIntl();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm({ label: name.trim() || 'Блок', color });
  }

  return createPortal(
    <Dialog open onClose={onCancel} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm bg-white rounded-md shadow-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
              <PlusIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">
                {intl.formatMessage({ id: 'dialog.new_block' })}
              </DialogTitle>
              <Description className="text-xs text-slate-500 mt-0.5">
                {intl.formatMessage({ id: 'dialog.new_block_subtitle' })}
              </Description>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {intl.formatMessage({ id: 'dialog.block_name' })}
              </label>
              <input
                ref={inputRef}
                type="text"
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                placeholder={intl.formatMessage({ id: 'dialog.block_name_placeholder' })}
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {intl.formatMessage({ id: 'dialog.block_color' })}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="w-7 h-7 rounded-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
                    style={{
                      backgroundColor: c,
                      border: color === c ? '2px solid #1e293b' : '1px solid rgba(0,0,0,0.1)',
                      transform: color === c ? 'scale(1.1)' : undefined,
                    }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
                <label
                  className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative"
                  title={intl.formatMessage({ id: 'card.change_color' })}
                >
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="absolute opacity-0 pointer-events-none"
                  />
                  <EyeDropperIcon className="w-3.5 h-3.5 text-slate-500" />
                </label>
              </div>

              <div
                className="rounded-md px-4 py-3 border-2 text-sm font-medium text-center"
                style={{ backgroundColor: color + '28', borderColor: color, color }}
              >
                {name.trim() || intl.formatMessage({ id: 'dialog.block_name_preview' })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                onClick={onCancel}
              >
                {intl.formatMessage({ id: 'dialog.block_cancel' })}
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                {intl.formatMessage({ id: 'dialog.block_add' })}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>,
    document.body
  );
}
