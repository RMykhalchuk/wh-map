export const LOCATIONS = [
  { id: 'loc-001', name: 'Склад №1 — Центральний',    color: '#0F172A' },
  { id: 'loc-002', name: 'Склад №2 — Північний',      color: '#1E3A5F' },
  { id: 'loc-003', name: 'Склад №3 — Промисловий',    color: '#1A3C34' },
];

export const ZONES = [
  { id: 'zone-001', location_id: 'loc-001', name: 'Зона A — Холодне зберігання',   color: '#2563EB' },
  { id: 'zone-002', location_id: 'loc-001', name: 'Зона B — Суха продукція',        color: '#16A34A' },
  { id: 'zone-003', location_id: 'loc-002', name: 'Зона C — Великогабаритні',       color: '#DC2626' },
  { id: 'zone-004', location_id: 'loc-002', name: 'Зона D — Небезпечні матеріали',  color: '#D97706' },
  { id: 'zone-005', location_id: 'loc-003', name: 'Зона E — Заморожені продукти',   color: '#0891B2' },
  { id: 'zone-006', location_id: 'loc-003', name: 'Зона F — Хімікати',              color: '#7C3AED' },
];

export const SECTORS = [
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

export const ROWS = [
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

function generateShelvesAndCells(rowId, rowPrefix, shelfCount, floorCount, cellsPerShelf) {
  const shelves = [];
  const cells = [];
  for (let s = 1; s <= shelfCount; s++) {
    const shelfId = `shelf-${rowId}-${s}`;
    shelves.push({ id: shelfId, row_id: rowId, name: `СТ ${String(s).padStart(2, '0')}`, position: s });
    for (let f = floorCount; f >= 1; f--) {
      for (let p = 1; p <= cellsPerShelf; p++) {
        const code = `${rowPrefix}-${String(s).padStart(2, '0')}-${String(f).padStart(2, '0')}-${String(p).padStart(2, '0')}`;
        const rand = Math.random();
        const status = rand < 0.55 ? 'occupied' : rand < 0.7 ? 'free' : rand < 0.85 ? 'reserved' : 'blocked';
        const cellType = Math.random() < 0.8 ? 'standard' : Math.random() < 0.5 ? 'heavy' : 'cold';
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

function generateContents() {
  const count = Math.floor(Math.random() * 5) + 1;
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    name: PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)] + ` код ${1000 + Math.floor(Math.random() * 9000)} м2`,
    quantity: -(Math.random() * 100).toFixed(3),
    updated_at: `${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 28) + 1} ${Math.floor(Math.random() * 24)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  }));
}

const rowShelfData = {};
for (const row of ROWS) {
  const prefix = row.name.replace('Ряд ', '').replace('-', '');
  const data = generateShelvesAndCells(row.id, prefix, 5, 5, 3);
  rowShelfData[row.id] = data;
}

export const SHELVES = Object.values(rowShelfData).flatMap(d => d.shelves);
export const CELLS = Object.values(rowShelfData).flatMap(d => d.cells);
