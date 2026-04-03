import { createColorPicker } from './colorpicker.js';

const CELL_SIZE = 30;
const MIN_W = 5;
const MIN_H = 3;

export function createCard({ element, label, childCount, childLabel, gridCols, gridRows, onUpdate, onDelete, onNavigate, canNavigate, readonly: initialReadonly }) {
  let readonly = initialReadonly;
  const el = document.createElement('div');
  el.className = 'wh-card map-element-card';

  let showColorPicker = false;
  let isDragging = false;
  let isResizing = false;
  let colorPickerInstance = null;
  let colorPickerWrap = null;
  let currentElement = { ...element };
  let currentLabel = label;
  let currentChildCount = childCount;
  let currentChildLabel = childLabel;

  function applyPosition() {
    el.style.left = currentElement.grid_x * CELL_SIZE + 'px';
    el.style.top = currentElement.grid_y * CELL_SIZE + 'px';
    el.style.width = currentElement.grid_w * CELL_SIZE + 'px';
    el.style.height = currentElement.grid_h * CELL_SIZE + 'px';
    el.style.backgroundColor = currentElement.color + 'CC';
    el.style.borderColor = currentElement.color;
  }

  function closePicker() {
    showColorPicker = false;
    if (colorPickerWrap && colorPickerWrap.parentNode) {
      colorPickerWrap.parentNode.removeChild(colorPickerWrap);
    }
    colorPickerWrap = null;
    colorPickerInstance = null;
  }

  function openPicker() {
    if (colorPickerWrap) { closePicker(); return; }
    showColorPicker = true;
    colorPickerWrap = document.createElement('div');
    colorPickerWrap.setAttribute('data-action', 'true');
    colorPickerWrap.style.cssText = 'position:fixed;z-index:9999';
    colorPickerInstance = createColorPicker(currentElement.color, (color) => {
      onUpdate({ color });
      closePicker();
    });
    colorPickerWrap.appendChild(colorPickerInstance.el);
    document.body.appendChild(colorPickerWrap);
    requestAnimationFrame(() => positionPicker());
  }

  function positionPicker() {
    if (!colorPickerWrap || !paletteBtn) return;
    const btnRect = paletteBtn.getBoundingClientRect();
    const pickerRect = colorPickerWrap.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = pickerRect.width || 180;
    const ph = pickerRect.height || 200;
    let top = btnRect.bottom + 4;
    let left = btnRect.right - pw;
    if (left < 4) left = 4;
    if (left + pw > vw - 4) left = vw - pw - 4;
    if (top + ph > vh - 4) top = btnRect.top - ph - 4;
    colorPickerWrap.style.top = top + 'px';
    colorPickerWrap.style.left = left + 'px';
  }

  function render() {
    el.innerHTML = '';
    el.className = `wh-card map-element-card${isDragging ? ' dragging' : ''}${isResizing ? ' resizing' : ''}`;
    applyPosition();

    if (!readonly) {
      el.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else if (canNavigate) {
      el.style.cursor = 'pointer';
    } else {
      el.style.cursor = 'default';
    }

    const header = document.createElement('div');
    header.className = 'card-header-bar';
    header.style.backgroundColor = readonly ? 'transparent' : 'rgba(0,0,0,.18)';

    if (!readonly) {
      const titleRow = document.createElement('div');
      titleRow.className = 'wh-card-title-row';
      const grip = document.createElement('i');
      grip.className = 'bi bi-grip-vertical';
      grip.style.cssText = 'font-size:11px;color:rgba(255,255,255,.7);flex-shrink:0';
      titleRow.appendChild(grip);
      const nameSpan = document.createElement('span');
      nameSpan.className = 'wh-card-name';
      nameSpan.textContent = currentLabel;
      titleRow.appendChild(nameSpan);
      header.appendChild(titleRow);
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    if (!readonly) {
      paletteBtn = document.createElement('button');
      paletteBtn.type = 'button';
      paletteBtn.setAttribute('data-action', 'true');
      paletteBtn.className = 'card-action-btn';
      paletteBtn.title = 'Змінити колір';
      paletteBtn.innerHTML = '<i class="bi bi-palette"></i>';
      paletteBtn.addEventListener('click', e => { e.stopPropagation(); openPicker(); });
      actions.appendChild(paletteBtn);

      if (canNavigate) {
        const navBtn = document.createElement('button');
        navBtn.type = 'button';
        navBtn.setAttribute('data-action', 'true');
        navBtn.className = 'card-action-btn';
        navBtn.title = 'Перейти до деталей';
        navBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        navBtn.addEventListener('click', e => { e.stopPropagation(); onNavigate && onNavigate(); });
        actions.appendChild(navBtn);
      }

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.setAttribute('data-action', 'true');
      delBtn.className = 'card-action-btn danger';
      delBtn.title = 'Видалити з мапи';
      delBtn.innerHTML = '<i class="bi bi-trash3"></i>';
      delBtn.addEventListener('click', e => { e.stopPropagation(); onDelete && onDelete(); });
      actions.appendChild(delBtn);
    }

    header.appendChild(actions);
    el.appendChild(header);

    const body = document.createElement('div');
    body.className = 'card-body-center';

    if (readonly) {
      const lbl = document.createElement('span');
      lbl.style.cssText = `font-size:13px;font-weight:600;color:#fff;display:block;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.25)`;
      lbl.textContent = currentLabel;
      body.appendChild(lbl);
      if (currentChildCount !== undefined && currentChildCount !== null) {
        const countBadge = document.createElement('span');
        countBadge.className = 'wh-card-child-count';
        countBadge.textContent = currentChildLabel ? `${currentChildCount} ${currentChildLabel}` : currentChildCount;
        body.appendChild(countBadge);
      }
    } else {
      const sizeHint = document.createElement('span');
      sizeHint.style.cssText = `font-size:11px;color:rgba(255,255,255,.75)`;
      sizeHint.textContent = `${currentElement.grid_w}×${currentElement.grid_h}`;
      body.appendChild(sizeHint);
    }
    el.appendChild(body);

    if (!readonly) {
      const resizeHandle = document.createElement('div');
      resizeHandle.setAttribute('data-resize', 'true');
      resizeHandle.className = 'resize-handle';
      resizeHandle.style.backgroundColor = currentElement.color + '55';
      resizeHandle.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M7 1L1 7M7 4L4 7" stroke="${currentElement.color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
      resizeHandle.addEventListener('mousedown', handleResizeMouseDown);
      el.appendChild(resizeHandle);
    }
  }

  let paletteBtn = null;

  function handleMouseDown(e) {
    if (readonly) return;
    if (e.target.closest('[data-resize]')) return;
    if (e.target.closest('[data-action]')) return;
    e.preventDefault();
    isDragging = true;
    el.classList.add('dragging');
    el.style.cursor = 'grabbing';

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startElX = currentElement.grid_x;
    const startElY = currentElement.grid_y;

    function onMove(me) {
      const dx = Math.round((me.clientX - startMouseX) / CELL_SIZE);
      const dy = Math.round((me.clientY - startMouseY) / CELL_SIZE);
      const newX = Math.max(0, Math.min(gridCols - currentElement.grid_w, startElX + dx));
      const newY = Math.max(0, Math.min(gridRows - currentElement.grid_h, startElY + dy));
      if (newX !== currentElement.grid_x || newY !== currentElement.grid_y) {
        onUpdate({ grid_x: newX, grid_y: newY });
      }
    }

    function onUp() {
      isDragging = false;
      el.classList.remove('dragging');
      el.style.cursor = 'grab';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleResizeMouseDown(e) {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    el.classList.add('resizing');

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startW = currentElement.grid_w;
    const startH = currentElement.grid_h;

    function onMove(me) {
      const dx = Math.round((me.clientX - startMouseX) / CELL_SIZE);
      const dy = Math.round((me.clientY - startMouseY) / CELL_SIZE);
      const newW = Math.max(MIN_W, Math.min(gridCols - currentElement.grid_x, startW + dx));
      const newH = Math.max(MIN_H, Math.min(gridRows - currentElement.grid_y, startH + dy));
      if (newW !== currentElement.grid_w || newH !== currentElement.grid_h) {
        onUpdate({ grid_w: newW, grid_h: newH });
      }
    }

    function onUp() {
      isResizing = false;
      el.classList.remove('resizing');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleClick(e) {
    if (!readonly || !canNavigate) return;
    e.stopPropagation();
    onNavigate && onNavigate();
  }

  el.addEventListener('mousedown', handleMouseDown);
  el.addEventListener('click', handleClick);

  document.addEventListener('click', (e) => {
    if (showColorPicker && colorPickerWrap && !colorPickerWrap.contains(e.target) && e.target !== paletteBtn) {
      closePicker();
    }
  });

  function update(newElement, newLabel, newChildCount, newChildLabel) {
    currentElement = { ...newElement };
    if (newLabel !== undefined) currentLabel = newLabel;
    if (newChildCount !== undefined) currentChildCount = newChildCount;
    if (newChildLabel !== undefined) currentChildLabel = newChildLabel;
    if (colorPickerInstance) colorPickerInstance.update(currentElement.color);
    applyPosition();
    el.style.backgroundColor = currentElement.color + 'CC';
    el.style.borderColor = currentElement.color;
    render();
  }

  function setReadonly(isReadonly) {
    readonly = isReadonly;
    closePicker();
    render();
  }

  function updateGridBounds(newCols, newRows) {
    gridCols = newCols;
    gridRows = newRows;
  }

  render();

  return { el, update, setReadonly, updateGridBounds };
}

export { CELL_SIZE };
