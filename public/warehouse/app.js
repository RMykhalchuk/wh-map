import { createApi } from './api.js';
import { createStore } from './state.js';
import { createBreadcrumb } from './breadcrumb.js';
import { createSidebar } from './sidebar.js';
import { createGrid } from './grid.js';
import { createRowMap } from './rowmap.js';

export async function initWarehouseMap(container) {
  const api = createApi();

  const store = createStore({
    locations: [],
    zones: [],
    sectors: [],
    rows: [],
    shelves: [],
    cells: [],
    mapElements: [],
    loading: true,
    mode: 'view',
    nav: { level: 'locations' },
    draggedItem: null,
  });

  container.innerHTML = '';
  container.className = 'wh-app-root';

  const loadingEl = document.createElement('div');
  loadingEl.className = 'wh-loading';
  loadingEl.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Завантаження...</span></div>';
  container.appendChild(loadingEl);

  const mainEl = document.createElement('div');
  mainEl.className = 'warehouse-main';
  mainEl.style.display = 'none';
  container.appendChild(mainEl);

  let snapshotBeforeEdit = null;
  let hasUnsavedChanges = false;

  function markDirty() {
    if (!hasUnsavedChanges) {
      hasUnsavedChanges = true;
      const s = store.getState();
      breadcrumb.render(getBreadcrumbItems(s), s.mode, true);
    }
  }

  const breadcrumb = createBreadcrumb({
    onModeChange(newMode) {
      if (newMode === 'edit') {
        snapshotBeforeEdit = store.getState().mapElements.map(el => ({ ...el }));
        hasUnsavedChanges = false;
      }
      store.setState(s => ({ ...s, mode: newMode }));
    },
    onSave() {
      snapshotBeforeEdit = null;
      hasUnsavedChanges = false;
    },
    onCancel() {
      if (snapshotBeforeEdit !== null) {
        store.setState(s => ({ ...s, mapElements: snapshotBeforeEdit }));
        snapshotBeforeEdit = null;
      }
      hasUnsavedChanges = false;
      store.setState(s => ({ ...s, mode: 'view' }));
    },
  });
  mainEl.appendChild(breadcrumb.el);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'warehouse-body';
  mainEl.appendChild(bodyEl);

  const sidebar = createSidebar({
    onDragStart(item) {
      store.setState(s => ({ ...s, draggedItem: item }));
    },
    onItemClick(item) {
      const s = store.getState();
      if (getPlacedIds(s).has(item.id)) return;
      placeItem(store.getState(), item, null, null);
    },
  });
  bodyEl.appendChild(sidebar.el);

  const grid = createGrid({
    onDrop(elementId, gridX, gridY) {
      const s = store.getState();
      const allItems = [...s.locations, ...s.zones, ...s.sectors, ...s.rows];
      const item = allItems.find(i => String(i.id) === String(elementId));
      if (item) placeItem(s, item, gridX, gridY);
      store.setState(prev => ({ ...prev, draggedItem: null }));
    },
    onUpdate(id, updates) {
      markDirty();
      api.updateMapElement(id, updates).then(({ data }) => {
        if (data) {
          store.setState(prev => ({
            ...prev,
            mapElements: prev.mapElements.map(el => el.id === id ? data : el),
          }));
        }
      });
      store.setState(prev => ({
        ...prev,
        mapElements: prev.mapElements.map(el => el.id === id ? { ...el, ...updates } : el),
      }));
    },
    onDelete(id) {
      markDirty();
      api.deleteMapElement(id);
      store.setState(prev => ({
        ...prev,
        mapElements: prev.mapElements.filter(el => el.id !== id),
      }));
    },
    onNavigate(elementId) {
      const s = store.getState();
      if (s.nav.level === 'locations') {
        const loc = s.locations.find(l => l.id === elementId);
        store.setState(prev => ({ ...prev, nav: { level: 'zones', locationId: elementId, locationName: loc?.name } }));
      } else if (s.nav.level === 'zones') {
        const zone = s.zones.find(z => z.id === elementId);
        store.setState(prev => ({
          ...prev,
          nav: { ...prev.nav, level: 'sectors', zoneId: elementId, zoneName: zone?.name },
        }));
      } else if (s.nav.level === 'sectors') {
        const sector = s.sectors.find(sc => sc.id === elementId);
        store.setState(prev => ({
          ...prev,
          nav: { ...prev.nav, level: 'rows', sectorId: elementId, sectorName: sector?.name },
        }));
      } else if (s.nav.level === 'rows') {
        const row = s.rows.find(r => r.id === elementId);
        store.setState(prev => ({
          ...prev,
          nav: { ...prev.nav, level: 'rowmap', rowId: elementId, rowName: row?.name },
        }));
      }
    },
    canNavigate: true,
    readonly: false,
  });
  bodyEl.appendChild(grid.el);

  let rowMapInstance = null;

  async function placeItem(s, item, gridX, gridY) {
    if (!item) return;
    const { nav, mapElements } = s;
    if (nav.level === 'rowmap') return;
    const elementType = nav.level === 'locations' ? 'location'
      : nav.level === 'zones' ? 'zone'
      : nav.level === 'sectors' ? 'sector'
      : 'row';
    const parentId = nav.level === 'zones' ? nav.locationId
      : nav.level === 'sectors' ? nav.zoneId
      : nav.level === 'rows' ? nav.sectorId
      : null;
    const currentMapElements = mapElements.filter(el => {
      if (el.element_type !== elementType) return false;
      if (nav.level === 'zones') return el.parent_id === nav.locationId;
      if (nav.level === 'sectors') return el.parent_id === nav.zoneId;
      if (nav.level === 'rows') return el.parent_id === nav.sectorId;
      return true;
    });
    const placedIds = new Set(currentMapElements.map(el => el.element_id));
    if (placedIds.has(item.id)) return;

    const NEW_W = 5, NEW_H = 3;

    function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function positionFree(px, py) {
      return !currentMapElements.some(el =>
        overlaps(px, py, NEW_W, NEW_H, el.grid_x, el.grid_y, el.grid_w || 5, el.grid_h || 3)
      );
    }

    let gx = gridX, gy = gridY;
    if (gx === null) {
      gx = 0; gy = 0;
      outer: while (true) {
        if (positionFree(gx, gy)) break outer;
        gx += NEW_W;
        if (gx > 20) { gx = 0; gy += NEW_H; }
      }
    }

    const newEl = {
      element_type: elementType,
      element_id: item.id,
      parent_id: parentId,
      grid_x: gx,
      grid_y: gy,
      grid_w: 5,
      grid_h: 3,
      color: item.color,
    };

    const { data } = await api.addMapElement(newEl);
    if (data) {
      markDirty();
      store.setState(prev => ({ ...prev, mapElements: [...prev.mapElements, data] }));
    }
  }

  function getPlacedIds(s) {
    const { nav, mapElements } = s;
    const elementType = nav.level === 'locations' ? 'location'
      : nav.level === 'zones' ? 'zone'
      : nav.level === 'sectors' ? 'sector'
      : 'row';
    return new Set(
      mapElements.filter(el => {
        if (el.element_type !== elementType) return false;
        if (nav.level === 'zones') return el.parent_id === nav.locationId;
        if (nav.level === 'sectors') return el.parent_id === nav.zoneId;
        if (nav.level === 'rows') return el.parent_id === nav.sectorId;
        return true;
      }).map(el => el.element_id)
    );
  }

  function getLabel(s, elementId) {
    if (s.nav.level === 'locations') return s.locations.find(l => l.id === elementId)?.name ?? elementId;
    if (s.nav.level === 'zones') return s.zones.find(z => z.id === elementId)?.name ?? elementId;
    if (s.nav.level === 'sectors') return s.sectors.find(sc => sc.id === elementId)?.name ?? elementId;
    return s.rows.find(r => r.id === elementId)?.name ?? elementId;
  }

  function getChildCount(s, elementId) {
    if (s.nav.level === 'locations') return s.zones.filter(z => z.location_id === elementId).length;
    if (s.nav.level === 'zones') return s.sectors.filter(sc => sc.zone_id === elementId).length;
    if (s.nav.level === 'sectors') return s.rows.filter(r => r.sector_id === elementId).length;
    return s.shelves.filter(sh => sh.row_id === elementId).length;
  }

  function getChildLabel(s, count) {
    if (s.nav.level === 'locations') return count === 1 ? 'зона' : count >= 2 && count <= 4 ? 'зони' : 'зон';
    if (s.nav.level === 'zones') return count === 1 ? 'сектор' : count >= 2 && count <= 4 ? 'сектори' : 'секторів';
    if (s.nav.level === 'sectors') return count === 1 ? 'ряд' : count >= 2 && count <= 4 ? 'ряди' : 'рядів';
    return count === 1 ? 'стелаж' : count >= 2 && count <= 4 ? 'стелажі' : 'стелажів';
  }

  function getCurrentItems(s) {
    const { nav, locations, zones, sectors, rows } = s;
    if (nav.level === 'locations') return locations;
    if (nav.level === 'zones') return zones.filter(z => z.location_id === nav.locationId);
    if (nav.level === 'sectors') return sectors.filter(sc => sc.zone_id === nav.zoneId);
    return rows.filter(r => r.sector_id === nav.sectorId);
  }

  function getBreadcrumbItems(s) {
    const { nav } = s;
    const items = [{ label: 'Локації', onClick: () => store.setState(prev => ({ ...prev, nav: { level: 'locations' } })) }];
    if (nav.level === 'zones' || nav.level === 'sectors' || nav.level === 'rows' || nav.level === 'rowmap') {
      items.push({
        label: nav.locationName ?? 'Склад',
        onClick: () => store.setState(prev => ({ ...prev, nav: { level: 'zones', locationId: nav.locationId, locationName: nav.locationName } })),
      });
    }
    if (nav.level === 'sectors' || nav.level === 'rows' || nav.level === 'rowmap') {
      items.push({
        label: nav.zoneName ?? 'Зона',
        onClick: () => store.setState(prev => ({ ...prev, nav: { level: 'sectors', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName } })),
      });
    }
    if (nav.level === 'rows' || nav.level === 'rowmap') {
      items.push({
        label: nav.sectorName ?? 'Сектор',
        onClick: () => store.setState(prev => ({ ...prev, nav: { level: 'rows', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName, sectorId: nav.sectorId, sectorName: nav.sectorName } })),
      });
    }
    if (nav.level === 'rowmap') {
      items.push({ label: nav.rowName ?? 'Ряд', onClick: () => {} });
    }
    return items;
  }

  store.subscribe(s => {
    if (s.loading) {
      loadingEl.style.display = 'flex';
      mainEl.style.display = 'none';
      return;
    }
    loadingEl.style.display = 'none';
    mainEl.style.display = 'flex';

    const isRowMap = s.nav.level === 'rowmap';
    const isView = s.mode === 'view';

    breadcrumb.render(getBreadcrumbItems(s), isRowMap ? null : s.mode, hasUnsavedChanges);

    if (isRowMap) {
      sidebar.el.style.display = 'none';
      grid.el.style.display = 'none';

      if (rowMapInstance) {
        rowMapInstance.el.remove();
        rowMapInstance = null;
      }

      rowMapInstance = createRowMap({
        rowId: s.nav.rowId,
        rowName: s.nav.rowName ?? 'Ряд',
        shelves: s.shelves,
        cells: s.cells,
        onBack: () => store.setState(prev => ({
          ...prev,
          nav: { level: 'rows', locationId: prev.nav.locationId, locationName: prev.nav.locationName, zoneId: prev.nav.zoneId, zoneName: prev.nav.zoneName, sectorId: prev.nav.sectorId, sectorName: prev.nav.sectorName },
        })),
      });
      bodyEl.appendChild(rowMapInstance.el);
      return;
    }

    if (rowMapInstance) {
      rowMapInstance.el.remove();
      rowMapInstance = null;
    }

    sidebar.el.style.display = isView ? 'none' : '';
    grid.el.style.display = '';

    const elementType = s.nav.level === 'locations' ? 'location'
      : s.nav.level === 'zones' ? 'zone'
      : s.nav.level === 'sectors' ? 'sector'
      : 'row';
    const currentMapElements = s.mapElements.filter(el => {
      if (el.element_type !== elementType) return false;
      if (s.nav.level === 'zones') return el.parent_id === s.nav.locationId;
      if (s.nav.level === 'sectors') return el.parent_id === s.nav.zoneId;
      if (s.nav.level === 'rows') return el.parent_id === s.nav.sectorId;
      return true;
    });
    const placedIds = new Set(currentMapElements.map(el => el.element_id));
    const currentItems = getCurrentItems(s);

    const placedItems = currentMapElements.map(el => {
      const count = getChildCount(s, el.element_id);
      return {
        mapElement: el,
        label: getLabel(s, el.element_id),
        childCount: count,
        childLabel: getChildLabel(s, count),
      };
    });

    sidebar.render(s.nav.level, currentItems, placedIds);

    grid.setReadonly(isView);
    grid.setItems(placedItems);
  });

  const initialData = await api.fetchAll();
  store.setState(prev => ({ ...prev, ...initialData, loading: false }));
}
