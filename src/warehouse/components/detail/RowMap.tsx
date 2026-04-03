import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  XMarkIcon, ChevronLeftIcon, ChevronRightIcon,
  MagnifyingGlassIcon, AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon, EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';
import type { Cell, Shelf } from '../../types';

interface StatusConfig {
  labelId: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  occupied:  { labelId: 'status.occupied',  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', dot: '#2563EB' },
  free:      { labelId: 'status.free',      color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' },
  reserved:  { labelId: 'status.reserved',  color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  blocked:   { labelId: 'status.blocked',   color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', dot: '#6B7280' },
};

const TYPE_LABEL_IDS: Record<string, string> = {
  standard:  'cell_type.standard',
  heavy:     'cell_type.heavy',
  cold:      'cell_type.cold',
  hazardous: 'cell_type.hazardous',
};

const ROWS_PER_PAGE_OPTIONS = [24, 48, 96];
const DEFAULT_ROWS_PER_PAGE = 24;

interface NavChip {
  label: string;
  onClick: () => void;
}

interface Props {
  rowId: string;
  rowName: string;
  shelves: Shelf[];
  cells: Cell[];
  navChips?: NavChip[];
  onBack: () => void;
}

const MOCK_TASK_ROWS = [
  { id: 1, type: 'Приймання', kind: 'Основний',    warehouse: 'Назва складу', status: 'Статус', priority: 1, start: '2025.09.05 12:00', end: '-',                  assignee: '-',          created: 'Документ №1234\n2025.08.05\n9:00' },
  { id: 2, type: 'Внутрішнє', kind: 'Поповнення',  warehouse: 'Назва складу', status: 'Статус', priority: 1, start: '2025.09.05 12:00', end: '-',                  assignee: 'Дмитрів В.І', created: 'Дмитрів В.І\n2025.08.05\n9:00', progress: 40 },
  { id: 3, type: 'Контроль',  kind: 'Планова',     warehouse: 'Назва складу', status: 'Статус', priority: 1, start: '2025.09.05 12:00', end: '2025.09.05 12:00',  assignee: 'Дмитрів В.І', created: 'Документ №1234\n2025.08.05\n9:00' },
  { id: 4, type: 'Чаткова',   kind: 'Поточна',     warehouse: 'Назва складу', status: 'Статус', priority: 1, start: '2025.09.05 12:00', end: '2025.09.05 12:00',  assignee: 'Дмитрів В.І', created: 'Документ №1234\n2025.08.05\n9:00' },
];

export default function RowMap({ rowId, rowName, shelves, cells, navChips = [], onBack }: Props) {
  const intl = useIntl();
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const shelvesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = shelvesScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = shelvesScrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
  }, [updateScrollState]);

  const scrollShelves = (dir: 'left' | 'right') => {
    const el = shelvesScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const [contentsPage, setContentsPage] = useState(1);
  const [contentsRowsPerPage, setContentsRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [contentsSearch, setContentsSearch] = useState('');
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksRowsPerPage] = useState(5);

  const rowShelves = useMemo(() =>
    shelves.filter(s => s.row_id === rowId).sort((a, b) => a.position - b.position),
    [shelves, rowId]
  );
  const rowCells = useMemo(() =>
    cells.filter(c => c.row_id === rowId),
    [cells, rowId]
  );

  const maxFloor = rowCells.reduce((m, c) => Math.max(m, c.floor), 0);
  const floors = Array.from({ length: maxFloor }, (_, i) => maxFloor - i);

  const sortedCells = useMemo(() => {
    const result: Cell[] = [];
    rowShelves.forEach(shelf => {
      floors.forEach(f => {
        rowCells
          .filter(c => c.shelf_id === shelf.id && c.floor === f)
          .sort((a, b) => a.position - b.position)
          .forEach(c => result.push(c));
      });
    });
    return result;
  }, [rowShelves, floors, rowCells]);

  const currentIdx = selectedCell ? sortedCells.findIndex(c => c.id === selectedCell.id) : -1;

  function selectCell(cell: Cell) {
    if (selectedCell?.id === cell.id) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell(cell);
    setContentsPage(1);
    setContentsSearch('');
  }

  const contents = selectedCell?.contents || [];
  const filteredContents = contentsSearch
    ? contents.filter(item => item.name.toLowerCase().includes(contentsSearch.toLowerCase()))
    : contents;
  const contentsTotalPages = Math.max(1, Math.ceil(filteredContents.length / contentsRowsPerPage));
  const contentsPageItems = filteredContents.slice(
    (contentsPage - 1) * contentsRowsPerPage,
    contentsPage * contentsRowsPerPage
  );

  const tasksTotalPages = Math.max(1, Math.ceil(MOCK_TASK_ROWS.length / tasksRowsPerPage));
  const tasksPageItems = MOCK_TASK_ROWS.slice(
    (tasksPage - 1) * tasksRowsPerPage,
    tasksPage * tasksRowsPerPage
  );

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-slate-50 p-4 gap-4">
      <div className="bg-white rounded-md border border-slate-200 shadow-sm">
        <div className="flex overflow-hidden">
          {floors.length > 0 && (
            <div className="flex flex-shrink-0 items-stretch p-4 pr-0">
              <div className="flex flex-col pt-3 gap-2">
                {floors.map(f => (
                  <div key={f} className="h-[44px] flex items-center justify-center">
                    <span className="text-[13px] font-semibold text-slate-500 whitespace-nowrap">
                      {String(f).padStart(2, '0')}
                    </span>
                  </div>
                ))}
                <div className="h-[28px] flex items-center justify-center pt-1">
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">{intl.formatMessage({ id: 'rowmap.floor_prefix' })}</span>
                </div>
              </div>
              <div className="w-px bg-slate-200 self-stretch ml-2" />
            </div>
          )}

          <div className="relative flex-1 min-w-0">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollShelves('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-slate-800 hover:shadow-lg transition-all"
                style={{ marginTop: '-14px' }}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollShelves('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-slate-800 hover:shadow-lg transition-all"
                style={{ marginTop: '-14px' }}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            )}
          <div ref={shelvesScrollRef} className="flex overflow-x-auto p-4 gap-4 items-start scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {rowShelves.map(shelf => {
              const maxPos = rowCells
                .filter(c => c.shelf_id === shelf.id)
                .reduce((m, c) => Math.max(m, c.position), 0);
              const positions = Array.from({ length: maxPos }, (_, i) => i + 1);

              return (
                <div
                  key={shelf.id}
                  className="flex-shrink-0 flex flex-col rounded-md border border-slate-200 bg-slate-50 p-3 gap-2"
                >
                  {floors.map(f => (
                    <div key={f} className="flex gap-2">
                      {positions.map(pos => {
                        const cell = rowCells.find(
                          c => c.shelf_id === shelf.id && c.floor === f && c.position === pos
                        );
                        if (!cell) {
                          return (
                            <div
                              key={pos}
                              className="w-[44px] h-[44px] rounded-md border border-dashed border-slate-200 bg-white opacity-40"
                            />
                          );
                        }
                        const cfg = STATUS_CONFIG[cell.status] || STATUS_CONFIG.free;
                        const isSelected = selectedCell?.id === cell.id;
                        return (
                          <button
                            key={cell.id}
                            type="button"
                            className="w-[44px] h-[44px] rounded-md border-2 text-[13px] font-bold transition-all cursor-pointer focus:outline-none"
                            style={{
                              background: isSelected ? cfg.dot : cfg.bg,
                              borderColor: isSelected ? cfg.dot : cfg.border,
                              color: isSelected ? '#fff' : cfg.color,
                              boxShadow: isSelected ? `0 2px 10px ${cfg.dot}55` : undefined,
                            }}
                            title={cell.code}
                            onClick={() => selectCell(cell)}
                          >
                            {String(cell.position).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  <div className="h-[28px] flex items-center justify-center pt-1">
                    <span className="text-[12px] font-semibold text-slate-600">{shelf.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {selectedCell && (
            <DetailPanel
              cell={selectedCell}
              currentIdx={currentIdx}
              total={sortedCells.length}
              onClose={() => setSelectedCell(null)}
              onPrev={() => selectCell(sortedCells[currentIdx - 1])}
              onNext={() => selectCell(sortedCells[currentIdx + 1])}
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <span className="text-[15px] font-semibold text-slate-800">
            {intl.formatMessage({ id: 'rowmap.cell_contents' })}
          </span>
        </div>

        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 gap-3">
          <button type="button" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800 transition-colors">
            <span className="text-blue-500 font-semibold text-[16px] leading-none">+</span>
            {intl.formatMessage({ id: 'rowmap.add_filter' })}
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contentsSearch}
                onChange={e => { setContentsSearch(e.target.value); setContentsPage(1); }}
                placeholder={intl.formatMessage({ id: 'rowmap.search' })}
                className="pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-40"
              />
            </div>
            <button type="button" className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">№</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{intl.formatMessage({ id: 'rowmap.table_name' })}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Статус</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Партія</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Виготовлення</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Вжити до</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Пакінг</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Кондиція</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{intl.formatMessage({ id: 'rowmap.table_qty' })}</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody>
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-[12px] text-slate-400">
                    {intl.formatMessage({ id: 'rowmap.cell_empty' })}
                  </td>
                </tr>
              ) : (
                contentsPageItems.map((item, i) => {
                  const rowNum = (contentsPage - 1) * contentsRowsPerPage + i + 1;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-slate-300" />
                      </td>
                      <td className="px-3 py-3 text-[13px] text-slate-500">{rowNum}</td>
                      <td className="px-3 py-3">
                        <div className="text-[13px] font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Будматеріали</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          Зарезервований
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-slate-600 whitespace-nowrap">20250708-01</td>
                      <td className="px-3 py-3 text-[12px] text-slate-600 whitespace-nowrap">8.8.2025</td>
                      <td className="px-3 py-3 text-[12px] text-slate-600 whitespace-nowrap">8.9.2025</td>
                      <td className="px-3 py-3 text-[12px] text-slate-600">Палета</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          OK
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                        {item.quantity}
                      </td>
                      <td className="px-2 py-3">
                        <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                          <EllipsisVerticalIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredContents.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Рядків на сторінці</span>
              <select
                value={contentsRowsPerPage}
                onChange={e => { setContentsRowsPerPage(Number(e.target.value)); setContentsPage(1); }}
                className="text-[11px] border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 focus:outline-none"
              >
                {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 mr-1">
                {(contentsPage - 1) * contentsRowsPerPage + 1}-{Math.min(contentsPage * contentsRowsPerPage, filteredContents.length)} з {filteredContents.length}
              </span>
              <Paginator page={contentsPage} totalPages={contentsTotalPages} onChange={setContentsPage} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <span className="text-[15px] font-semibold text-slate-800">Використання в завданнях</span>
        </div>

        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 gap-3">
          <button type="button" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800 transition-colors">
            <span className="text-blue-500 font-semibold text-[16px] leading-none">+</span>
            {intl.formatMessage({ id: 'rowmap.add_filter' })}
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={intl.formatMessage({ id: 'rowmap.search' })}
                className="pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-40"
              />
            </div>
            <button type="button" className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">№</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Вид</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Тип</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Склад</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Пріоритет</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Старт</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Завершення</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Виконавець</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Створено</th>
              </tr>
            </thead>
            <tbody>
              {tasksPageItems.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-[13px] text-slate-500">{row.id}</td>
                  <td className="px-3 py-3 text-[13px] text-slate-700 whitespace-nowrap">{row.type}</td>
                  <td className="px-3 py-3 text-[13px] text-slate-700 whitespace-nowrap">{row.kind}</td>
                  <td className="px-3 py-3 text-[13px] text-slate-700 whitespace-nowrap">{row.warehouse}</td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="w-6 h-6 rounded-md bg-green-500 text-white text-[11px] font-bold inline-flex items-center justify-center">
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-slate-600 whitespace-nowrap">{row.start}</td>
                  <td className="px-3 py-3 text-[12px] text-slate-600 whitespace-nowrap">
                    {row.progress !== undefined ? (
                      <div className="flex flex-col gap-1 min-w-[100px]">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${row.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{row.progress}/120 кг</span>
                      </div>
                    ) : row.end}
                  </td>
                  <td className="px-3 py-3 text-[12px] font-semibold text-slate-700 whitespace-nowrap">{row.assignee}</td>
                  <td className="px-3 py-3 text-[12px] text-slate-700 whitespace-pre-line">{row.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Рядків на сторінці</span>
            <select className="text-[11px] border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 focus:outline-none">
              <option>5</option>
              <option>10</option>
              <option>25</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1">
              {(tasksPage - 1) * tasksRowsPerPage + 1}-{Math.min(tasksPage * tasksRowsPerPage, MOCK_TASK_ROWS.length)} з {MOCK_TASK_ROWS.length}
            </span>
            <Paginator page={tasksPage} totalPages={tasksTotalPages} onChange={setTasksPage} />
          </div>
        </div>
      </div>
    </div>
  );
}


interface DetailPanelProps {
  cell: Cell;
  currentIdx: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function DetailPanel({ cell, currentIdx, total, onClose, onPrev, onNext }: DetailPanelProps) {
  const intl = useIntl();
  const cfg = STATUS_CONFIG[cell.status] || STATUS_CONFIG.free;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < total - 1;

  const loadPct = cell.max_weight_kg > 0
    ? Math.min(100, Math.round((cell.current_weight_kg / cell.max_weight_kg) * 100))
    : 0;

  const volumePct = cell.max_volume_m2 > 0
    ? Math.min(100, Math.round((cell.current_volume_m2 / cell.max_volume_m2) * 100))
    : 0;

  return (
    <div className="w-72 flex-shrink-0 border-l border-slate-100 flex flex-col bg-white">
      <div className="px-5 pt-5 pb-4 flex items-center gap-2">
        <button
          type="button"
          className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all disabled:opacity-30 flex-shrink-0"
          disabled={!hasPrev}
          onClick={onPrev}
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="flex-1 text-[17px] font-bold text-slate-900 font-mono leading-tight">{cell.code}</span>
        <button
          type="button"
          className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all disabled:opacity-30 flex-shrink-0"
          disabled={!hasNext}
          onClick={onNext}
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex-shrink-0"
          onClick={onClose}
        >
          <EllipsisVerticalIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DetailRow label={intl.formatMessage({ id: 'rowmap.detail_status' })}>
          <span className="text-[15px] text-slate-800">
            {intl.formatMessage({ id: cfg.labelId })}
          </span>
        </DetailRow>
        <DetailRow label={intl.formatMessage({ id: 'rowmap.detail_type' })}>
          <span className="text-[15px] text-slate-800">
            {intl.formatMessage({ id: TYPE_LABEL_IDS[cell.cell_type] ?? 'cell_type.standard' })}
          </span>
        </DetailRow>
        <DetailRow label={intl.formatMessage({ id: 'rowmap.detail_dimensions' })}>
          <span className="text-[15px] text-slate-800">
            {cell.width_cm}м / {cell.depth_cm}м / {cell.height_cm}м
          </span>
        </DetailRow>
        <DetailRow label={intl.formatMessage({ id: 'rowmap.detail_load' })}>
          <div className="flex flex-col gap-2 w-full">
            <span className="text-[15px] text-slate-800">
              {cell.current_weight_kg} / {cell.max_weight_kg} кг.
            </span>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${loadPct}%`,
                  background: loadPct > 80 ? '#D97706' : '#2563EB',
                }}
              />
            </div>
          </div>
        </DetailRow>
        <DetailRow label={intl.formatMessage({ id: 'rowmap.detail_volume' })}>
          <div className="flex flex-col gap-2 w-full">
            <span className="text-[15px] text-slate-800">
              {cell.current_volume_m2} / {cell.max_volume_m2} м².
            </span>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${volumePct}%`,
                  background: volumePct > 80 ? '#D97706' : '#2563EB',
                }}
              />
            </div>
          </div>
        </DetailRow>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode; alt?: boolean }) {
  return (
    <div className="px-5 py-3">
      <div className="text-[13px] font-normal text-slate-400 mb-1">{label}</div>
      {children}
    </div>
  );
}

interface PaginatorProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}

function Paginator({ page, totalPages, onChange }: PaginatorProps) {
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-all"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeftIcon className="w-3.5 h-3.5" />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-[11px] text-slate-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`w-7 h-7 flex items-center justify-center rounded-md text-[12px] font-semibold transition-all ${
              p === page ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-all"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRightIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
