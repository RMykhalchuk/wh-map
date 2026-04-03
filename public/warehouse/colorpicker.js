const PRESET_COLORS = [
  '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE',
  '#10B981', '#34D399', '#6EE7B7', '#D1FAE5',
  '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2',
  '#F59E0B', '#FCD34D', '#FDE68A', '#FEF3C7',
  '#06B6D4', '#22D3EE', '#67E8F9', '#CFFAFE',
  '#64748B', '#94A3B8', '#CBD5E1', '#F1F5F9',
];

export function createColorPicker(value, onChange) {
  const el = document.createElement('div');
  el.className = 'wh-color-picker-popup';

  function render(currentValue) {
    const swatchGrid = document.createElement('div');
    swatchGrid.className = 'wh-color-swatch-grid';

    PRESET_COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wh-color-swatch';
      btn.style.backgroundColor = color;
      btn.style.border = currentValue === color
        ? '2px solid #111'
        : '1px solid rgba(0,0,0,0.1)';
      btn.addEventListener('click', () => onChange(color));
      swatchGrid.appendChild(btn);
    });

    const row = document.createElement('div');
    row.className = 'wh-color-picker-row';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = currentValue;
    colorInput.className = 'wh-color-native';
    colorInput.addEventListener('input', e => onChange(e.target.value));

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = currentValue;
    textInput.className = 'form-control form-control-sm';
    textInput.style.fontFamily = 'monospace';
    textInput.placeholder = '#000000';
    textInput.addEventListener('input', e => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onChange(e.target.value);
    });

    row.appendChild(colorInput);
    row.appendChild(textInput);

    el.innerHTML = '';
    el.appendChild(swatchGrid);
    el.appendChild(row);
  }

  render(value);

  function update(newValue) {
    render(newValue);
  }

  return { el, update };
}
