export function createBreadcrumb({ onModeChange, onSave, onCancel }) {
  const el = document.createElement('div');
  el.className = 'breadcrumb-bar';

  const icon = document.createElement('i');
  icon.className = 'bi bi-building text-secondary';
  icon.style.fontSize = '15px';
  el.appendChild(icon);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'breadcrumb');
  nav.style.cssText = 'flex:1;min-width:0';

  const ol = document.createElement('ol');
  ol.className = 'breadcrumb mb-0';
  nav.appendChild(ol);
  el.appendChild(nav);

  const modeSwitcher = document.createElement('div');
  modeSwitcher.className = 'mode-switcher';

  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'mode-btn';
  viewBtn.innerHTML = '<i class="bi bi-eye"></i> Перегляд';
  viewBtn.addEventListener('click', () => onModeChange('view'));

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'mode-btn';
  editBtn.innerHTML = '<i class="bi bi-pencil"></i> Редагування';
  editBtn.addEventListener('click', () => onModeChange('edit'));

  modeSwitcher.appendChild(viewBtn);
  modeSwitcher.appendChild(editBtn);
  el.appendChild(modeSwitcher);

  const editActions = document.createElement('div');
  editActions.className = 'wh-edit-actions';
  editActions.style.display = 'none';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'wh-cancel-btn';
  cancelBtn.innerHTML = '<i class="bi bi-x-lg"></i> Скасувати';
  cancelBtn.addEventListener('click', () => {
    onCancel && onCancel();
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'wh-save-btn';
  saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Зберегти';
  saveBtn.addEventListener('click', () => {
    onSave && onSave();
    onModeChange('view');
  });

  editActions.appendChild(cancelBtn);
  editActions.appendChild(saveBtn);
  el.appendChild(editActions);

  function render(items, mode, hasChanges = false) {
    ol.innerHTML = '';

    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = `breadcrumb-item${index === items.length - 1 ? ' active' : ''}`;

      if (index === items.length - 1) {
        const span = document.createElement('span');
        span.style.cssText = 'font-weight:600;font-size:13px';
        span.textContent = item.label;
        li.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-link p-0';
        btn.style.cssText = 'font-size:13px;font-weight:500;text-decoration:none';
        btn.textContent = item.label;
        btn.addEventListener('click', item.onClick);
        li.appendChild(btn);
      }
      ol.appendChild(li);
    });

    modeSwitcher.style.display = mode === null ? 'none' : '';
    viewBtn.className = `mode-btn${mode === 'view' ? ' active' : ''}`;
    editBtn.className = `mode-btn${mode === 'edit' ? ' active' : ''}`;
    editActions.style.display = (mode === 'edit' && hasChanges) ? '' : 'none';
  }

  return { el, render };
}
