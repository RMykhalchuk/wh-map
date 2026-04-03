import React from 'react';
import { PencilSquareIcon, CheckIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';
import type { AppMode } from '../types';

interface BreadcrumbChip {
  label: string;
  onClick: () => void;
}

interface Props {
  levelLabel: string;
  chips: BreadcrumbChip[];
  mode: AppMode | null;
  hasChanges: boolean;
  onModeChange: (mode: AppMode) => void;
  onSave: () => void;
  onCancel: () => void;
  showInfo?: boolean;
  onInfo?: () => void;
}

export default function Breadcrumb({ levelLabel, chips, mode, hasChanges, onModeChange, onSave, onCancel, showInfo, onInfo }: Props) {
  const intl = useIntl();
  const isEdit = mode === 'edit';

  return (
    <div className="flex items-center gap-3 px-6 bg-white border-b border-slate-200 flex-shrink-0 h-14">
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {levelLabel && (
          <span className="text-[14px] font-semibold text-slate-800 flex-shrink-0">{levelLabel}</span>
        )}
        {chips.map((chip, i) => (
          <button
            key={i}
            type="button"
            onClick={chip.onClick}
            className="px-3 py-1 rounded-full border border-slate-200 text-[12px] font-medium text-slate-600 bg-white flex-shrink-0 cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {showInfo && (
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          onClick={onInfo}
        >
          <InformationCircleIcon className="w-5 h-5" />
        </button>
      )}

      {mode !== null && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEdit && hasChanges ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-[13px] font-medium cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100"
                onClick={onCancel}
              >
                <XMarkIcon className="w-4 h-4" />
                {intl.formatMessage({ id: 'action.cancel' })}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-none bg-[#f5c518] text-slate-900 text-[13px] font-semibold cursor-pointer transition-all shadow-sm hover:bg-[#e6b800] active:bg-[#d4a900]"
                onClick={onSave}
              >
                <CheckIcon className="w-4 h-4" />
                {intl.formatMessage({ id: 'action.save' })}
              </button>
            </>
          ) : !isEdit ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-[13px] font-medium cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 shadow-sm"
              onClick={() => onModeChange('edit')}
            >
              <PencilSquareIcon className="w-4 h-4" />
              {intl.formatMessage({ id: 'mode.edit' })}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-[13px] font-medium cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100"
                onClick={onCancel}
              >
                <XMarkIcon className="w-4 h-4" />
                {intl.formatMessage({ id: 'action.cancel' })}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-none bg-[#f5c518] text-slate-900 text-[13px] font-semibold cursor-pointer transition-all shadow-sm hover:bg-[#e6b800] active:bg-[#d4a900]"
                onClick={onSave}
              >
                <CheckIcon className="w-4 h-4" />
                {intl.formatMessage({ id: 'action.save' })}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
