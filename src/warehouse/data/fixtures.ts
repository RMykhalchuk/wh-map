import type { Location, Zone, Sector, Row, Shelf, Cell, ContentItem, MapElement, CustomElement, WallElement } from '../types';

export const LOCATIONS: Location[] = [
  { id: 'loc-001', name: 'Склад №1 — Центральний',    color: '#0F172A' },
  { id: 'loc-002', name: 'Склад №2 — Північний',      color: '#1E3A5F' },
  { id: 'loc-003', name: 'Склад №3 — Промисловий',    color: '#1A3C34' },
];

export const ZONES: Zone[] = [
  { id: 'zone-001', location_id: 'loc-001', name: 'Зона A — Холодне зберігання',   color: '#2563EB' },
  { id: 'zone-002', location_id: 'loc-001', name: 'Зона B — Суха продукція',        color: '#16A34A' },
  { id: 'zone-003', location_id: 'loc-002', name: 'Зона C — Великогабаритні',       color: '#DC2626' },
  { id: 'zone-004', location_id: 'loc-002', name: 'Зона D — Небезпечні матеріали',  color: '#D97706' },
  { id: 'zone-005', location_id: 'loc-003', name: 'Зона E — Заморожені продукти',   color: '#0891B2' },
  { id: 'zone-006', location_id: 'loc-003', name: 'Зона F — Хімікати',              color: '#7C3AED' },
];

export const SECTORS: Sector[] = [
  { id: 'sec-a1', zone_id: 'zone-001', name: 'Сектор A1', color: '#3B82F6' },
  { id: 'sec-a2', zone_id: 'zone-001', name: 'Сектор A2', color: '#60A5FA' },
  { id: 'sec-a3', zone_id: 'zone-001', name: 'Сектор A3', color: '#93C5FD' },
  { id: 'sec-b1', zone_id: 'zone-002', name: 'Сектор B1', color: '#22C55E' },
  { id: 'sec-b2', zone_id: 'zone-002', name: 'Сектор B2', color: '#86EFAC' },
  { id: 'sec-c1', zone_id: 'zone-003', name: 'Сектор C1', color: '#EF4444' },
  { id: 'sec-c2', zone_id: 'zone-003', name: 'Сектор C2', color: '#FCA5A5' },
  { id: 'sec-d1', zone_id: 'zone-004', name: 'Сектор D1', color: '#F59E0B' },
  { id: 'sec-d2', zone_id: 'zone-004', name: 'Сектор D2', color: '#FCD34D' },
];

export const ROWS: Row[] = [
  { id: 'row-a1-1', sector_id: 'sec-a1', name: 'Ряд A1-1', color: '#BFDBFE' },
  { id: 'row-a1-2', sector_id: 'sec-a1', name: 'Ряд A1-2', color: '#93C5FD' },
  { id: 'row-a1-3', sector_id: 'sec-a1', name: 'Ряд A1-3', color: '#60A5FA' },
  { id: 'row-a2-1', sector_id: 'sec-a2', name: 'Ряд A2-1', color: '#DBEAFE' },
  { id: 'row-a2-2', sector_id: 'sec-a2', name: 'Ряд A2-2', color: '#EFF6FF' },
  { id: 'row-a3-1', sector_id: 'sec-a3', name: 'Ряд A3-1', color: '#A5F3FC' },
  { id: 'row-b1-1', sector_id: 'sec-b1', name: 'Ряд B1-1', color: '#D9F99D' },
  { id: 'row-b1-2', sector_id: 'sec-b1', name: 'Ряд B1-2', color: '#BEF264' },
  { id: 'row-b1-3', sector_id: 'sec-b1', name: 'Ряд B1-3', color: '#D1FAE5' },
  { id: 'row-b2-1', sector_id: 'sec-b2', name: 'Ряд B2-1', color: '#FDE68A' },
  { id: 'row-b2-2', sector_id: 'sec-b2', name: 'Ряд B2-2', color: '#ECFDF5' },
  { id: 'row-c1-1', sector_id: 'sec-c1', name: 'Ряд C1-1', color: '#FECACA' },
  { id: 'row-c1-2', sector_id: 'sec-c1', name: 'Ряд C1-2', color: '#FCA5A5' },
  { id: 'row-c2-1', sector_id: 'sec-c2', name: 'Ряд C2-1', color: '#FEE2E2' },
  { id: 'row-d1-1', sector_id: 'sec-d1', name: 'Ряд D1-1', color: '#FED7AA' },
  { id: 'row-d1-2', sector_id: 'sec-d1', name: 'Ряд D1-2', color: '#FDBA74' },
  { id: 'row-d2-1', sector_id: 'sec-d2', name: 'Ряд D2-1', color: '#FEF08A' },
  { id: 'row-d2-2', sector_id: 'sec-d2', name: 'Ряд D2-2', color: '#FDE68A' },
];

const PRODUCT_NAMES = [
  'Piatto Red 7,4×30×0,9 клінкер',
  'Granite Grey 60×60×1,2',
  'Marble White 30×60×0,8',
  'Ceramic Brown 20×40×0,7',
  'Porcelain Black 45×45×1,0',
  'Terracotta 25×25×1,5',
  'Mosaic Blue 30×30×0,6',
  'Quartz Beige 60×120×2,0',
];

function generateContents(): ContentItem[] {
  const count = Math.floor(Math.random() * 5) + 1;
  return Array.from({ length: count }, () => ({
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    name: PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)] + ` код ${1000 + Math.floor(Math.random() * 9000)} м2`,
    quantity: parseFloat((-(Math.random() * 100)).toFixed(3)),
    updated_at: `${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 28) + 1} ${Math.floor(Math.random() * 24)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  }));
}

function generateShelvesAndCells(rowId: string, rowPrefix: string, shelfCount: number, floorCount: number, cellsPerShelf: number): { shelves: Shelf[]; cells: Cell[] } {
  const shelves: Shelf[] = [];
  const cells: Cell[] = [];
  for (let s = 1; s <= shelfCount; s++) {
    const shelfId = `shelf-${rowId}-${s}`;
    shelves.push({ id: shelfId, row_id: rowId, name: `СТ ${String(s).padStart(2, '0')}`, position: s });
    for (let f = floorCount; f >= 1; f--) {
      for (let p = 1; p <= cellsPerShelf; p++) {
        const code = `${rowPrefix}-${String(s).padStart(2, '0')}-${String(f).padStart(2, '0')}-${String(p).padStart(2, '0')}`;
        const rand = Math.random();
        const status: Cell['status'] = rand < 0.55 ? 'occupied' : rand < 0.7 ? 'free' : rand < 0.85 ? 'reserved' : 'blocked';
        const cellTypeRand = Math.random();
        const cellType: Cell['cell_type'] = cellTypeRand < 0.8 ? 'standard' : cellTypeRand < 0.9 ? 'heavy' : 'cold';
        const maxW = cellType === 'heavy' ? 1000 : 500;
        const curW = status === 'occupied' ? Math.floor(Math.random() * maxW * 0.8) : status === 'reserved' ? Math.floor(Math.random() * maxW * 0.3) : 0;
        const maxVol = 200;
        const curVol = status === 'occupied' ? Math.floor(Math.random() * maxVol * 0.85) : status === 'reserved' ? Math.floor(Math.random() * maxVol * 0.3) : 0;
        cells.push({
          id: `cell-${rowId}-${s}-${f}-${p}`,
          shelf_id: shelfId,
          row_id: rowId,
          code,
          floor: f,
          position: p,
          status,
          cell_type: cellType,
          width_cm: 100,
          depth_cm: 80,
          height_cm: 200,
          max_weight_kg: maxW,
          current_weight_kg: curW,
          max_volume_m2: maxVol,
          current_volume_m2: curVol,
          contents: status === 'occupied' ? generateContents() : [],
        });
      }
    }
  }
  return { shelves, cells };
}

const rowShelfData: Record<string, { shelves: Shelf[]; cells: Cell[] }> = {};
for (const row of ROWS) {
  const prefix = row.name.replace('Ряд ', '').replace('-', '');
  rowShelfData[row.id] = generateShelvesAndCells(row.id, prefix, 5, 5, 3);
}

export const SHELVES: Shelf[] = Object.values(rowShelfData).flatMap(d => d.shelves);
export const CELLS: Cell[] = Object.values(rowShelfData).flatMap(d => d.cells);

export const INITIAL_MAP_ELEMENTS: MapElement[] = [
  { id: 'me-loc-001', element_type: 'location', element_id: 'loc-001', parent_id: null, grid_x: 1, grid_y: 1, grid_w: 8, grid_h: 5, color: '#2563EB' },
  { id: 'me-loc-002', element_type: 'location', element_id: 'loc-002', parent_id: null, grid_x: 11, grid_y: 1, grid_w: 8, grid_h: 5, color: '#16A34A' },
  { id: 'me-loc-003', element_type: 'location', element_id: 'loc-003', parent_id: null, grid_x: 1, grid_y: 8, grid_w: 8, grid_h: 5, color: '#DC2626' },

  { id: 'me-zone-001', element_type: 'zone', element_id: 'zone-001', parent_id: 'loc-001', grid_x: 1, grid_y: 1, grid_w: 8, grid_h: 4, color: '#2563EB' },
  { id: 'me-zone-002', element_type: 'zone', element_id: 'zone-002', parent_id: 'loc-001', grid_x: 11, grid_y: 1, grid_w: 8, grid_h: 4, color: '#16A34A' },

  { id: 'me-zone-003', element_type: 'zone', element_id: 'zone-003', parent_id: 'loc-002', grid_x: 1, grid_y: 1, grid_w: 8, grid_h: 4, color: '#DC2626' },
  { id: 'me-zone-004', element_type: 'zone', element_id: 'zone-004', parent_id: 'loc-002', grid_x: 11, grid_y: 1, grid_w: 8, grid_h: 4, color: '#D97706' },

  { id: 'me-zone-005', element_type: 'zone', element_id: 'zone-005', parent_id: 'loc-003', grid_x: 1, grid_y: 1, grid_w: 8, grid_h: 4, color: '#0891B2' },
  { id: 'me-zone-006', element_type: 'zone', element_id: 'zone-006', parent_id: 'loc-003', grid_x: 11, grid_y: 1, grid_w: 8, grid_h: 4, color: '#9333EA' },

  { id: 'me-sec-a1', element_type: 'sector', element_id: 'sec-a1', parent_id: 'zone-001', grid_x: 1, grid_y: 1, grid_w: 7, grid_h: 3, color: '#3B82F6' },
  { id: 'me-sec-a2', element_type: 'sector', element_id: 'sec-a2', parent_id: 'zone-001', grid_x: 10, grid_y: 1, grid_w: 7, grid_h: 3, color: '#60A5FA' },
  { id: 'me-sec-a3', element_type: 'sector', element_id: 'sec-a3', parent_id: 'zone-001', grid_x: 1, grid_y: 6, grid_w: 7, grid_h: 3, color: '#93C5FD' },

  { id: 'me-sec-b1', element_type: 'sector', element_id: 'sec-b1', parent_id: 'zone-002', grid_x: 1, grid_y: 1, grid_w: 7, grid_h: 3, color: '#22C55E' },
  { id: 'me-sec-b2', element_type: 'sector', element_id: 'sec-b2', parent_id: 'zone-002', grid_x: 10, grid_y: 1, grid_w: 7, grid_h: 3, color: '#86EFAC' },

  { id: 'me-sec-c1', element_type: 'sector', element_id: 'sec-c1', parent_id: 'zone-003', grid_x: 1, grid_y: 1, grid_w: 7, grid_h: 3, color: '#EF4444' },
  { id: 'me-sec-c2', element_type: 'sector', element_id: 'sec-c2', parent_id: 'zone-003', grid_x: 10, grid_y: 1, grid_w: 7, grid_h: 3, color: '#FCA5A5' },

  { id: 'me-sec-d1', element_type: 'sector', element_id: 'sec-d1', parent_id: 'zone-004', grid_x: 1, grid_y: 1, grid_w: 7, grid_h: 3, color: '#F59E0B' },
  { id: 'me-sec-d2', element_type: 'sector', element_id: 'sec-d2', parent_id: 'zone-004', grid_x: 10, grid_y: 1, grid_w: 7, grid_h: 3, color: '#FCD34D' },

  { id: 'me-row-a1-1', element_type: 'row', element_id: 'row-a1-1', parent_id: 'sec-a1', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#BFDBFE' },
  { id: 'me-row-a1-2', element_type: 'row', element_id: 'row-a1-2', parent_id: 'sec-a1', grid_x: 9, grid_y: 1, grid_w: 6, grid_h: 3, color: '#93C5FD' },
  { id: 'me-row-a1-3', element_type: 'row', element_id: 'row-a1-3', parent_id: 'sec-a1', grid_x: 1, grid_y: 6, grid_w: 6, grid_h: 3, color: '#60A5FA' },

  { id: 'me-row-a2-1', element_type: 'row', element_id: 'row-a2-1', parent_id: 'sec-a2', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#DBEAFE' },
  { id: 'me-row-a2-2', element_type: 'row', element_id: 'row-a2-2', parent_id: 'sec-a2', grid_x: 9, grid_y: 1, grid_w: 6, grid_h: 3, color: '#EFF6FF' },

  { id: 'me-row-a3-1', element_type: 'row', element_id: 'row-a3-1', parent_id: 'sec-a3', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#A5F3FC' },

  { id: 'me-row-b1-1', element_type: 'row', element_id: 'row-b1-1', parent_id: 'sec-b1', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#D9F99D' },
  { id: 'me-row-b1-2', element_type: 'row', element_id: 'row-b1-2', parent_id: 'sec-b1', grid_x: 9, grid_y: 1, grid_w: 6, grid_h: 3, color: '#BEF264' },
  { id: 'me-row-b1-3', element_type: 'row', element_id: 'row-b1-3', parent_id: 'sec-b1', grid_x: 1, grid_y: 6, grid_w: 6, grid_h: 3, color: '#D1FAE5' },

  { id: 'me-row-b2-1', element_type: 'row', element_id: 'row-b2-1', parent_id: 'sec-b2', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FDE68A' },
  { id: 'me-row-b2-2', element_type: 'row', element_id: 'row-b2-2', parent_id: 'sec-b2', grid_x: 9, grid_y: 1, grid_w: 6, grid_h: 3, color: '#ECFDF5' },

  { id: 'me-row-c1-1', element_type: 'row', element_id: 'row-c1-1', parent_id: 'sec-c1', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FECACA' },
  { id: 'me-row-c1-2', element_type: 'row', element_id: 'row-c1-2', parent_id: 'sec-c1', grid_x: 9, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FCA5A5' },

  { id: 'me-row-c2-1', element_type: 'row', element_id: 'row-c2-1', parent_id: 'sec-c2', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FEE2E2' },

  { id: 'me-row-d1-1', element_type: 'row', element_id: 'row-d1-1', parent_id: 'sec-d1', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FED7AA' },
  { id: 'me-row-d1-2', element_type: 'row', element_id: 'row-d1-2', parent_id: 'sec-d1', grid_x: 9, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FDBA74' },

  { id: 'me-row-d2-1', element_type: 'row', element_id: 'row-d2-1', parent_id: 'sec-d2', grid_x: 1, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FEF08A' },
  { id: 'me-row-d2-2', element_type: 'row', element_id: 'row-d2-2', parent_id: 'sec-d2', grid_x: 9, grid_y: 1, grid_w: 6, grid_h: 3, color: '#FDE68A' },
];

export const INITIAL_CUSTOM_ELEMENTS: CustomElement[] = [
  {
    id: 'co-office-loc',
    object_type: 'block',
    label: 'Офіс',
    color: '#64748B',
    grid_x: 21,
    grid_y: 1,
    grid_w: 4,
    grid_h: 4,
    nav_scope: 'locations',
    nav_parent_id: null,
  },
  {
    id: 'co-loading-loc',
    object_type: 'block',
    label: 'Зона завантаження',
    color: '#475569',
    grid_x: 1,
    grid_y: 15,
    grid_w: 18,
    grid_h: 3,
    nav_scope: 'locations',
    nav_parent_id: null,
  },
  {
    id: 'co-gate-loc',
    object_type: 'block',
    label: 'В\'їзні ворота',
    color: '#334155',
    grid_x: 21,
    grid_y: 6,
    grid_w: 4,
    grid_h: 3,
    nav_scope: 'locations',
    nav_parent_id: null,
  },
];

export const INITIAL_WALL_ELEMENTS: WallElement[] = [
  {
    id: 'wall-outer',
    points: [
      { x: 0, y: 0 },
      { x: 26, y: 0 },
      { x: 26, y: 19 },
      { x: 0, y: 19 },
    ],
    closed: true,
    color: '#1e293b',
    nav_scope: 'locations',
    nav_parent_id: null,
  },
];
