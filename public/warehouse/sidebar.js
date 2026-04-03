const LEVEL_LABELS = { locations: 'Локації', zones: 'Зони', sectors: 'Сектори', rows: 'Ряди' };
const LEVEL_ICONS  = { locations: 'bi-building', zones: 'bi-grid', sectors: 'bi-geo-alt', rows: 'bi-list-ul' };

export function createSidebar({ onDragStart, onItemClick }) {
  const el = document.createElement('div');
  el.className = 'sidebar';

  const header = document.createElement('div');
  header.className = 'sidebar-header';
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'sidebar-body';
  el.appendChild(body);

  function render(level, items, placedIds) {
    const unplaced = items.filter(i => !placedIds.has(i.id));
    const placed   = items.filter(i =>  placedIds.has(i.id));

    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px;color:#343a40">
        <i class="bi ${LEVEL_ICONS[level]}" style="font-size:14px"></i>
        <span>${LEVEL_LABELS[level]}</span>
      </div>
      <div style="font-size:11px;color:#adb5bd;margin-top:3px">Перетягніть елемент на мапу або натисніть</div>
    `;

    body.innerHTML = '';

    if (unplaced.length === 0 && placed.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;color:#adb5bd;font-size:13px;padding:16px 0';
      empty.textContent = 'Немає елементів';
      body.appendChild(empty);
      return;
    }

    if (unplaced.length > 0) {
      const lbl = document.createElement('div');
      lbl.className = 'section-label';
      lbl.textContent = 'Не розміщені';
      body.appendChild(lbl);

      unplaced.forEach(item => {
        const row = makeItemRow(item, false);
        row.addEventListener('dragstart', e => {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('text/plain', String(item.id));
          onDragStart(item);
        });
        row.addEventListener('click', () => onItemClick(item));
        body.appendChild(row);
      });
    }

    if (placed.length > 0) {
      const lbl = document.createElement('div');
      lbl.className = 'section-label';
      lbl.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid #f0f2f5';
      lbl.textContent = 'На мапі';
      body.appendChild(lbl);

      placed.forEach(item => {
        body.appendChild(makeItemRow(item, true));
      });
    }
  }

  function makeItemRow(item, isPlaced) {
    const row = document.createElement('div');
    row.className = `sidebar-item${isPlaced ? ' placed' : ''}`;
    if (!isPlaced) row.draggable = true;

    const dot = document.createElement('div');
    dot.className = 'color-dot';
    dot.style.backgroundColor = item.color;

    const name = document.createElement('span');
    name.style.cssText = 'font-size:13px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    if (isPlaced) name.style.color = '#6c757d';
    name.textContent = item.name;

    const icon = document.createElement('i');
    icon.className = isPlaced ? 'bi bi-check-circle-fill text-success' : 'bi bi-plus text-secondary';
    icon.style.fontSize = '12px';

    row.appendChild(dot);
    row.appendChild(name);
    row.appendChild(icon);
    return row;
  }

  return { el, render };
}
