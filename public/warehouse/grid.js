import { createCard, CELL_SIZE } from './card.js';

const DEFAULT_COLS = 16;
const DEFAULT_ROWS = 12;
const MIN_COLS = 4;
const MIN_ROWS = 4;
const MAX_COLS = 40;
const MAX_ROWS = 30;
const STORAGE_KEY = 'wh_grid_size';

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function loadGridSize() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function saveGridSize(cols, rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ cols, rows }));
}

export function createGrid({ onDrop, onUpdate, onDelete, onNavigate, canNavigate, readonly }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-area';

  let { cols: gridCols, rows: gridRows } = loadGridSize();

  const gridWrap = document.createElement('div');
  gridWrap.className = 'wh-grid-resizable';
  wrapper.appendChild(gridWrap);

  const grid = document.createElement('div');
  grid.className = `wh-map-grid map-grid${!readonly ? ' edit-mode' : ''}`;
  gridWrap.appendChild(grid);

  const empty = document.createElement('div');
  empty.className = 'map-empty';
  grid.appendChild(empty);

  const cardInstances = new Map();
  let currentReadonly = readonly;
  let currentItems = [];

  let handleRight = null;
  let handleBottom = null;
  let handleCorner = null;
  let sizeTooltip = null;

  function applyGridSize() {
    grid.style.width = gridCols * CELL_SIZE + 'px';
    grid.style.height = gridRows * CELL_SIZE + 'px';
    if (!currentReadonly) {
      grid.style.backgroundSize = `${CELL_SIZE}px ${CELL_SIZE}px`;
    }
    cardInstances.forEach(inst => inst.updateGridBounds && inst.updateGridBounds(gridCols, gridRows));
  }

  applyGridSize();

  if (!readonly) makeResizable();

  function showTooltip(x, y) {
    if (!sizeTooltip) return;
    sizeTooltip.textContent = `${gridCols} × ${gridRows}`;
    sizeTooltip.style.left = x + 'px';
    sizeTooltip.style.top = y + 'px';
    sizeTooltip.style.display = 'block';
  }

  function hideTooltip() {
    if (sizeTooltip) sizeTooltip.style.display = 'none';
  }

  function makeResizable() {
    handleRight = document.createElement('div');
    handleRight.className = 'wh-resize-handle wh-resize-right';

    handleBottom = document.createElement('div');
    handleBottom.className = 'wh-resize-handle wh-resize-bottom';

    handleCorner = document.createElement('div');
    handleCorner.className = 'wh-resize-handle wh-resize-corner';
    handleCorner.innerHTML = '<i class="bi bi-arrow-down-right"></i>';

    sizeTooltip = document.createElement('div');
    sizeTooltip.className = 'wh-resize-tooltip';
    sizeTooltip.style.display = 'none';

    gridWrap.appendChild(handleRight);
    gridWrap.appendChild(handleBottom);
    gridWrap.appendChild(handleCorner);
    gridWrap.appendChild(sizeTooltip);

    attachDrag(handleRight, 'right');
    attachDrag(handleBottom, 'bottom');
    attachDrag(handleCorner, 'both');
  }

  function removeResizable() {
    [handleRight, handleBottom, handleCorner, sizeTooltip].forEach(el => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    handleRight = handleBottom = handleCorner = sizeTooltip = null;
  }

  function attachDrag(handle, direction) {
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startCols = gridCols;
      const startRows = gridRows;

      document.body.style.cursor =
        direction === 'right' ? 'ew-resize' :
        direction === 'bottom' ? 'ns-resize' : 'nwse-resize';
      document.body.style.userSelect = 'none';

      grid.classList.add('wh-resizing');

      function onMove(me) {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;

        if (direction === 'right' || direction === 'both') {
          const newCols = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.round(startCols + dx / CELL_SIZE)));
          gridCols = newCols;
        }
        if (direction === 'bottom' || direction === 'both') {
          const newRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.round(startRows + dy / CELL_SIZE)));
          gridRows = newRows;
        }

        applyGridSize();

        const rect = gridWrap.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        showTooltip(
          rect.right - wrapperRect.left - 80,
          rect.bottom - wrapperRect.top - 36
        );
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        grid.classList.remove('wh-resizing');
        hideTooltip();
        saveGridSize(gridCols, gridRows);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function hasCollision(id, x, y, w, h) {
    for (const { mapElement } of currentItems) {
      if (mapElement.id === id) continue;
      if (rectsOverlap(x, y, w, h, mapElement.grid_x, mapElement.grid_y, mapElement.grid_w, mapElement.grid_h)) {
        return true;
      }
    }
    return false;
  }

  function hasCollisionForNew(x, y, w, h) {
    for (const { mapElement } of currentItems) {
      if (rectsOverlap(x, y, w, h, mapElement.grid_x, mapElement.grid_y, mapElement.grid_w, mapElement.grid_h)) {
        return true;
      }
    }
    return false;
  }

  [wrapper, grid].forEach(target => {
    target.addEventListener('dragover', e => {
      if (currentReadonly) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    });
  });

  [wrapper, grid].forEach(target => {
    target.addEventListener('drop', e => {
      if (currentReadonly) return;
      e.preventDefault();
      e.stopPropagation();
      const elementId = e.dataTransfer.getData('text/plain');
      if (!elementId) return;
      const rect = grid.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const gridX = Math.max(0, Math.min(gridCols - 3, Math.floor(x / CELL_SIZE)));
      const gridY = Math.max(0, Math.min(gridRows - 2, Math.floor(y / CELL_SIZE)));
      if (hasCollisionForNew(gridX, gridY, 3, 2)) return;
      onDrop(elementId, gridX, gridY);
    });
  });

  function updateEmptyMessage() {
    empty.innerHTML = `
      <div style="text-align:center">
        <div style="width:56px;height:56px;border-radius:14px;background:#f0f2f5;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
          <i class="bi bi-grid" style="font-size:24px;color:#ced4da"></i>
        </div>
        ${currentReadonly
          ? '<p style="color:#adb5bd;font-size:13px;margin:0">Карта порожня</p>'
          : '<p style="color:#adb5bd;font-size:13px;font-weight:500;margin:0">Перетягніть елементи сюди</p><p style="color:#ced4da;font-size:11px;margin:4px 0 0">або натисніть на елемент у списку</p>'
        }
      </div>
    `;
  }

  updateEmptyMessage();

  function setItems(items) {
    currentItems = items;
    const currentIds = new Set(items.map(i => i.mapElement.id));

    cardInstances.forEach((instance, id) => {
      if (!currentIds.has(id)) {
        if (instance.el.parentNode) instance.el.parentNode.removeChild(instance.el);
        cardInstances.delete(id);
      }
    });

    items.forEach(({ mapElement, label, childCount, childLabel }) => {
      if (cardInstances.has(mapElement.id)) {
        cardInstances.get(mapElement.id).update(mapElement, label, childCount, childLabel);
      } else {
        const card = createCard({
          element: mapElement,
          label,
          childCount,
          childLabel,
          gridCols,
          gridRows,
          onUpdate: (updates) => {
            const current = currentItems.find(i => i.mapElement.id === mapElement.id)?.mapElement ?? mapElement;
            const newX = updates.grid_x ?? current.grid_x;
            const newY = updates.grid_y ?? current.grid_y;
            const newW = updates.grid_w ?? current.grid_w;
            const newH = updates.grid_h ?? current.grid_h;
            if (hasCollision(mapElement.id, newX, newY, newW, newH)) return;
            onUpdate(mapElement.id, updates);
          },
          onDelete: () => onDelete(mapElement.id),
          onNavigate: onNavigate ? () => onNavigate(mapElement.element_id) : null,
          canNavigate: !!canNavigate,
          readonly: currentReadonly,
        });
        cardInstances.set(mapElement.id, card);
        grid.appendChild(card.el);
      }
    });

    empty.style.display = items.length === 0 ? 'flex' : 'none';
  }

  function setReadonly(isReadonly) {
    currentReadonly = isReadonly;
    if (isReadonly) {
      grid.classList.remove('edit-mode');
      grid.style.backgroundSize = '';
      removeResizable();
    } else {
      grid.classList.add('edit-mode');
      grid.style.backgroundSize = `${CELL_SIZE}px ${CELL_SIZE}px`;
      if (!handleRight) makeResizable();
    }
    updateEmptyMessage();
    cardInstances.forEach(instance => instance.setReadonly(isReadonly));
  }

  return { el: wrapper, setItems, setReadonly };
}

export { DEFAULT_COLS as GRID_COLS, DEFAULT_ROWS as GRID_ROWS };
