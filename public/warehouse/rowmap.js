const STATUS_CONFIG = {
  occupied:  { label: 'зайнята',    color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  free:      { label: 'вільна',     color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
  reserved:  { label: 'резервована', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  blocked:   { label: 'заблокована', color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB' },
};

const TYPE_LABELS = {
  standard:  'звичайна',
  heavy:     'важковагова',
  cold:      'холодна',
  hazardous: 'небезпечна',
};

export function createRowMap({ rowId, rowName, shelves, cells, onBack }) {
  const el = document.createElement('div');
  el.className = 'rm-root';

  let selectedCell = null;
  let contentsPage = 1;
  const CONTENTS_PER_PAGE = 10;

  const rowShelves = shelves.filter(s => s.row_id === rowId).sort((a, b) => a.position - b.position);
  const rowCells = cells.filter(c => c.row_id === rowId);

  const maxFloor = rowCells.reduce((m, c) => Math.max(m, c.floor), 0);
  const floors = Array.from({ length: maxFloor }, (_, i) => maxFloor - i);

  function render() {
    el.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'rm-layout';

    const left = document.createElement('div');
    left.className = 'rm-left';

    const header = document.createElement('div');
    header.className = 'rm-header';
    header.innerHTML = `
      <div class="rm-header-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <span>${rowName}</span>
      </div>
      <div class="rm-legend">
        ${Object.entries(STATUS_CONFIG).map(([k, v]) =>
          `<span class="rm-legend-dot" style="--dot-bg:${v.bg};--dot-border:${v.border};--dot-color:${v.color}">${v.label}</span>`
        ).join('')}
      </div>
    `;
    left.appendChild(header);

    const gridWrap = document.createElement('div');
    gridWrap.className = 'rm-grid-wrap';

    const floorLabels = document.createElement('div');
    floorLabels.className = 'rm-floor-labels';
    floorLabels.innerHTML = '<div class="rm-floor-label-spacer"></div>';
    floors.forEach(f => {
      const lbl = document.createElement('div');
      lbl.className = 'rm-floor-label';
      lbl.textContent = `П ${String(f).padStart(2, '0')}`;
      floorLabels.appendChild(lbl);
    });
    gridWrap.appendChild(floorLabels);

    const gridScroll = document.createElement('div');
    gridScroll.className = 'rm-grid-scroll';

    rowShelves.forEach(shelf => {
      const shelfCol = document.createElement('div');
      shelfCol.className = 'rm-shelf-col';

      floors.forEach(f => {
        const floorRow = document.createElement('div');
        floorRow.className = 'rm-floor-row';

        const shelfCells = rowCells
          .filter(c => c.shelf_id === shelf.id && c.floor === f)
          .sort((a, b) => a.position - b.position);

        shelfCells.forEach(cell => {
          const cfg = STATUS_CONFIG[cell.status] || STATUS_CONFIG.free;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'rm-cell-btn' + (selectedCell?.id === cell.id ? ' rm-cell-selected' : '');
          btn.style.setProperty('--cell-bg', cfg.bg);
          btn.style.setProperty('--cell-border', cfg.border);
          btn.style.setProperty('--cell-color', cfg.color);
          btn.textContent = String(cell.position).padStart(2, '0');
          btn.title = cell.code;
          btn.addEventListener('click', () => {
            selectedCell = cell;
            contentsPage = 1;
            render();
          });
          floorRow.appendChild(btn);
        });

        shelfCol.appendChild(floorRow);
      });

      const shelfLabel = document.createElement('div');
      shelfLabel.className = 'rm-shelf-label';
      shelfLabel.textContent = shelf.name;
      shelfCol.appendChild(shelfLabel);

      gridScroll.appendChild(shelfCol);
    });

    gridWrap.appendChild(gridScroll);
    left.appendChild(gridWrap);

    if (selectedCell) {
      left.appendChild(renderContentsPanel(selectedCell));
    }

    layout.appendChild(left);

    if (selectedCell) {
      layout.appendChild(renderDetailPanel(selectedCell));
    }

    el.appendChild(layout);
  }

  function getSortedCells() {
    const sorted = [];
    rowShelves.forEach(shelf => {
      floors.forEach(f => {
        rowCells
          .filter(c => c.shelf_id === shelf.id && c.floor === f)
          .sort((a, b) => a.position - b.position)
          .forEach(c => sorted.push(c));
      });
    });
    return sorted;
  }

  function renderDetailPanel(cell) {
    const cfg = STATUS_CONFIG[cell.status] || STATUS_CONFIG.free;
    const panel = document.createElement('div');
    panel.className = 'rm-detail-panel';

    const sortedCells = getSortedCells();
    const currentIdx = sortedCells.findIndex(c => c.id === cell.id);
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx < sortedCells.length - 1;

    panel.innerHTML = `
      <div class="rm-detail-header">
        <div class="rm-detail-header-top">
          <div class="rm-detail-title">
            <span class="rm-detail-code">${cell.code}</span>
          </div>
          <button type="button" class="rm-detail-close" title="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="rm-detail-nav">
          <button type="button" class="rm-nav-btn" id="nav-prev" title="Попередня комірка" ${hasPrev ? '' : 'disabled'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span class="rm-nav-counter">${currentIdx + 1} / ${sortedCells.length}</span>
          <button type="button" class="rm-nav-btn" id="nav-next" title="Наступна комірка" ${hasNext ? '' : 'disabled'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      <div class="rm-detail-body">
        <div class="rm-detail-row">
          <span class="rm-detail-label">Статус:</span>
          <span class="rm-detail-value rm-detail-status" style="color:${cfg.color}">${cfg.label}</span>
        </div>
        <div class="rm-detail-row">
          <span class="rm-detail-label">Тип:</span>
          <span class="rm-detail-value">${TYPE_LABELS[cell.cell_type] || cell.cell_type}</span>
        </div>
        <div class="rm-detail-row">
          <span class="rm-detail-label">Розміри:</span>
          <span class="rm-detail-value rm-detail-bold">${cell.width_cm}×${cell.depth_cm}×${cell.height_cm}</span>
        </div>
        <div class="rm-detail-row">
          <span class="rm-detail-label">Завантаження:</span>
          <span class="rm-detail-value">
            <span style="color:${cell.current_weight_kg > cell.max_weight_kg * 0.8 ? '#D97706' : '#16A34A'};font-weight:600">${cell.current_weight_kg}</span>
            <span style="color:#6B7280"> / ${cell.max_weight_kg} кг.</span>
          </span>
        </div>
        <div class="rm-detail-row">
          <span class="rm-detail-label">Об'єм:</span>
          <span class="rm-detail-value">
            <span style="color:${cell.current_volume_m2 > cell.max_volume_m2 * 0.8 ? '#D97706' : '#16A34A'};font-weight:600">${cell.current_volume_m2}</span>
            <span style="color:#6B7280"> / ${cell.max_volume_m2} м².</span>
          </span>
        </div>
        ${renderWeightBar(cell)}
      </div>
    `;

    panel.querySelector('.rm-detail-close').addEventListener('click', () => {
      selectedCell = null;
      render();
    });

    if (hasPrev) {
      panel.querySelector('#nav-prev').addEventListener('click', () => {
        selectedCell = sortedCells[currentIdx - 1];
        contentsPage = 1;
        render();
      });
    }

    if (hasNext) {
      panel.querySelector('#nav-next').addEventListener('click', () => {
        selectedCell = sortedCells[currentIdx + 1];
        contentsPage = 1;
        render();
      });
    }

    return panel;
  }

  function renderWeightBar(cell) {
    const pct = Math.min(100, Math.round((cell.current_weight_kg / cell.max_weight_kg) * 100));
    const color = pct > 80 ? '#D97706' : pct > 50 ? '#2563EB' : '#16A34A';
    return `
      <div class="rm-bar-wrap">
        <div class="rm-bar-track">
          <div class="rm-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="rm-bar-pct" style="color:${color}">${pct}%</span>
      </div>
    `;
  }

  function renderContentsPanel(cell) {
    const panel = document.createElement('div');
    panel.className = 'rm-contents-panel';

    const contents = cell.contents || [];
    const total = contents.length;
    const totalPages = Math.max(1, Math.ceil(total / CONTENTS_PER_PAGE));
    const pageItems = contents.slice((contentsPage - 1) * CONTENTS_PER_PAGE, contentsPage * CONTENTS_PER_PAGE);

    const header = document.createElement('div');
    header.className = 'rm-contents-header';
    header.innerHTML = `<span class="rm-contents-title">Вміст комірки</span>`;
    panel.appendChild(header);

    if (total === 0) {
      const empty = document.createElement('div');
      empty.className = 'rm-contents-empty';
      empty.textContent = 'Комірка порожня';
      panel.appendChild(empty);
      return panel;
    }

    const table = document.createElement('table');
    table.className = 'rm-contents-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Назва</th>
          <th>Кількість</th>
          <th>Оновлення</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    pageItems.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rm-item-name">${item.name}</td>
        <td class="rm-item-qty ${parseFloat(item.quantity) < 0 ? 'rm-qty-neg' : 'rm-qty-pos'}">${item.quantity}</td>
        <td class="rm-item-date">${item.updated_at}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    panel.appendChild(table);

    if (totalPages > 1) {
      const pager = document.createElement('div');
      pager.className = 'rm-pager';
      pager.innerHTML = `<span class="rm-pager-info">1-${pageItems.length} з ${total}</span>`;

      const btns = document.createElement('div');
      btns.className = 'rm-pager-btns';

      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'rm-pager-btn';
      prev.disabled = contentsPage === 1;
      prev.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>`;
      prev.addEventListener('click', () => { contentsPage--; render(); });
      btns.appendChild(prev);

      for (let p = 1; p <= totalPages; p++) {
        const pb = document.createElement('button');
        pb.type = 'button';
        pb.className = 'rm-pager-btn' + (p === contentsPage ? ' rm-pager-active' : '');
        pb.textContent = p;
        const pg = p;
        pb.addEventListener('click', () => { contentsPage = pg; render(); });
        btns.appendChild(pb);
      }

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'rm-pager-btn';
      next.disabled = contentsPage === totalPages;
      next.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>`;
      next.addEventListener('click', () => { contentsPage++; render(); });
      btns.appendChild(next);

      pager.appendChild(btns);
      panel.appendChild(pager);
    }

    return panel;
  }

  render();

  return { el };
}
