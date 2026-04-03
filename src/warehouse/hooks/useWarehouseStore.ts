import { useState, useCallback, useRef } from 'react';
import { createApi } from '../api';
import type { WarehouseState, MapElement, CustomElement, WallElement, NavState, GridPoint } from '../types';

const api = createApi();

const INITIAL_STATE: WarehouseState = {
  locations: [],
  zones: [],
  sectors: [],
  rows: [],
  shelves: [],
  cells: [],
  mapElements: [],
  customElements: [],
  wallElements: [],
  loading: true,
  mode: 'view',
  nav: { level: 'locations' },
};

interface Snapshot {
  mapElements: MapElement[];
  customElements: CustomElement[];
  wallElements: WallElement[];
}

export function useWarehouseStore() {
  const [state, setState] = useState<WarehouseState>(INITIAL_STATE);
  const snapshotRef = useRef<Snapshot | null>(null);
  const dirtyRef = useRef(false);

  const load = useCallback(async () => {
    const data = await api.fetchAll();
    setState(prev => {
      const next = {
        ...prev,
        ...data,
        customElements: data.customElements ?? prev.customElements,
        wallElements: data.wallElements ?? prev.wallElements,
        loading: false,
      };

      function autoSkipInitial(navState: NavState, state: typeof next): NavState {
        if (state.mode !== 'view') return navState;

        if (navState.level === 'locations') {
          if (state.locations.length === 1) {
            const only = state.locations[0];
            return autoSkipInitial({ level: 'zones', locationId: only.id, locationName: only.name }, state);
          }
        }
        if (navState.level === 'zones') {
          const children = state.zones.filter(z => z.location_id === navState.locationId);
          if (children.length === 1) {
            const only = children[0];
            return autoSkipInitial({ ...navState, level: 'sectors', zoneId: only.id, zoneName: only.name }, state);
          }
        }
        if (navState.level === 'sectors') {
          const children = state.sectors.filter(sc => sc.zone_id === navState.zoneId);
          if (children.length === 1) {
            const only = children[0];
            return autoSkipInitial({ ...navState, level: 'rows', sectorId: only.id, sectorName: only.name }, state);
          }
        }
        if (navState.level === 'rows') {
          const children = state.rows.filter(r => r.sector_id === navState.sectorId);
          if (children.length === 1) {
            const only = children[0];
            return autoSkipInitial({ ...navState, level: 'rowmap', rowId: only.id, rowName: only.name }, state);
          }
        }
        return navState;
      }

      return { ...next, nav: autoSkipInitial(next.nav, next) };
    });
  }, []);

  const setMode = useCallback((newMode: 'view' | 'edit') => {
    if (newMode === 'edit') {
      setState(prev => {
        snapshotRef.current = {
          mapElements: prev.mapElements.map(el => ({ ...el })),
          customElements: prev.customElements.map(el => ({ ...el })),
          wallElements: prev.wallElements.map(el => ({ ...el, points: el.points.map(p => ({ ...p })) })),
        };
        dirtyRef.current = false;
        return { ...prev, mode: newMode };
      });
    } else {
      setState(prev => ({ ...prev, mode: newMode }));
    }
  }, []);

  const save = useCallback(() => {
    snapshotRef.current = null;
    dirtyRef.current = false;
    setState(prev => ({ ...prev, mode: 'view' }));
  }, []);

  const cancel = useCallback(() => {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    dirtyRef.current = false;
    if (snapshot !== null) {
      setState(prev => ({
        ...prev,
        mapElements: snapshot.mapElements,
        customElements: snapshot.customElements,
        wallElements: snapshot.wallElements,
        mode: 'view',
      }));
    } else {
      setState(prev => ({ ...prev, mode: 'view' }));
    }
  }, []);

  const navigate = useCallback((elementId: string) => {
    setState(prev => {
      const { nav, mode } = prev;

      function buildNav(currentNav: NavState, targetLevel: NavState['level'], id: string, name?: string): NavState {
        if (targetLevel === 'zones') return { level: 'zones', locationId: id, locationName: name };
        if (targetLevel === 'sectors') return { ...currentNav, level: 'sectors', zoneId: id, zoneName: name };
        if (targetLevel === 'rows') return { ...currentNav, level: 'rows', sectorId: id, sectorName: name };
        if (targetLevel === 'rowmap') return { ...currentNav, level: 'rowmap', rowId: id, rowName: name };
        return currentNav;
      }

      function autoSkip(navState: NavState): NavState {
        if (mode !== 'view') return navState;

        if (navState.level === 'zones') {
          const children = prev.zones.filter(z => z.location_id === navState.locationId);
          if (children.length === 1) {
            const only = children[0];
            return autoSkip({ ...navState, level: 'sectors', zoneId: only.id, zoneName: only.name });
          }
        }
        if (navState.level === 'sectors') {
          const children = prev.sectors.filter(sc => sc.zone_id === navState.zoneId);
          if (children.length === 1) {
            const only = children[0];
            return autoSkip({ ...navState, level: 'rows', sectorId: only.id, sectorName: only.name });
          }
        }
        if (navState.level === 'rows') {
          const children = prev.rows.filter(r => r.sector_id === navState.sectorId);
          if (children.length === 1) {
            const only = children[0];
            return autoSkip({ ...navState, level: 'rowmap', rowId: only.id, rowName: only.name });
          }
        }
        return navState;
      }

      if (nav.level === 'locations') {
        const loc = prev.locations.find(l => l.id === elementId);
        const next = buildNav(nav, 'zones', elementId, loc?.name);
        return { ...prev, nav: autoSkip(next) };
      }
      if (nav.level === 'zones') {
        const zone = prev.zones.find(z => z.id === elementId);
        const next = buildNav(nav, 'sectors', elementId, zone?.name);
        return { ...prev, nav: autoSkip(next) };
      }
      if (nav.level === 'sectors') {
        const sector = prev.sectors.find(s => s.id === elementId);
        const next = buildNav(nav, 'rows', elementId, sector?.name);
        return { ...prev, nav: autoSkip(next) };
      }
      if (nav.level === 'rows') {
        const row = prev.rows.find(r => r.id === elementId);
        return { ...prev, nav: buildNav(nav, 'rowmap', elementId, row?.name) };
      }
      return prev;
    });
  }, []);

  const navTo = useCallback((nav: NavState) => {
    setState(prev => ({ ...prev, nav }));
  }, []);

  const placeItem = useCallback(async (item: { id: string; color: string }, gridX: number | null, gridY: number | null) => {
    setState(prev => {
      const { nav, mapElements } = prev;
      if (nav.level === 'rowmap') return prev;

      const elementType = nav.level === 'locations' ? 'location'
        : nav.level === 'zones' ? 'zone'
        : nav.level === 'sectors' ? 'sector'
        : 'row' as const;

      const parentId = nav.level === 'zones' ? nav.locationId ?? null
        : nav.level === 'sectors' ? nav.zoneId ?? null
        : nav.level === 'rows' ? nav.sectorId ?? null
        : null;

      const currentMapElements = mapElements.filter(el => {
        if (el.element_type !== elementType) return false;
        if (nav.level === 'zones') return el.parent_id === nav.locationId;
        if (nav.level === 'sectors') return el.parent_id === nav.zoneId;
        if (nav.level === 'rows') return el.parent_id === nav.sectorId;
        return true;
      });

      if (currentMapElements.some(el => el.element_id === item.id)) return prev;

      const NEW_W = 5, NEW_H = 3;

      function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
      }

      let gx = gridX ?? 0;
      let gy = gridY ?? 0;

      if (gridX === null || gridX === undefined) {
        gx = 0; gy = 0;
        while (currentMapElements.some(el => overlaps(gx, gy, NEW_W, NEW_H, el.grid_x, el.grid_y, el.grid_w || 5, el.grid_h || 3))) {
          gx += NEW_W;
          if (gx > 20) { gx = 0; gy += NEW_H; }
        }
      }

      const newEl: MapElement = {
        id: `me-${Date.now()}-${Math.random()}`,
        element_type: elementType,
        element_id: item.id,
        parent_id: parentId,
        grid_x: gx,
        grid_y: gy,
        grid_w: NEW_W,
        grid_h: NEW_H,
        color: item.color,
      };

      dirtyRef.current = true;
      api.addMapElement(newEl);
      return { ...prev, mapElements: [...prev.mapElements, newEl] };
    });
  }, []);

  const updateMapElement = useCallback((id: string, updates: Partial<MapElement>) => {
    dirtyRef.current = true;
    api.updateMapElement(id, updates);
    setState(prev => ({
      ...prev,
      mapElements: prev.mapElements.map(el => el.id === id ? { ...el, ...updates } : el),
    }));
  }, []);

  const deleteMapElement = useCallback((id: string) => {
    dirtyRef.current = true;
    api.deleteMapElement(id);
    setState(prev => ({
      ...prev,
      mapElements: prev.mapElements.filter(el => el.id !== id),
    }));
  }, []);

  const addCustomElement = useCallback(({ type, label, color }: { type: string; label?: string; color?: string }, navContext: NavState) => {
    setState(prev => {
      const parentKey = navContext.level === 'zones' ? { scope: 'location', parentId: navContext.locationId ?? null }
        : navContext.level === 'sectors' ? { scope: 'zone', parentId: navContext.zoneId ?? null }
        : navContext.level === 'rows' ? { scope: 'sector', parentId: navContext.sectorId ?? null }
        : { scope: 'locations', parentId: null };

      const defaultW = 4;
      const defaultH = 3;

      const existingCustomInScope = prev.customElements.filter(el =>
        el.nav_scope === parentKey.scope && el.nav_parent_id === parentKey.parentId
      );

      const elementType = navContext.level === 'locations' ? 'location'
        : navContext.level === 'zones' ? 'zone'
        : navContext.level === 'sectors' ? 'sector'
        : 'row' as const;
      const existingMapInScope = prev.mapElements.filter(el => {
        if (el.element_type !== elementType) return false;
        if (navContext.level === 'zones') return el.parent_id === navContext.locationId;
        if (navContext.level === 'sectors') return el.parent_id === navContext.zoneId;
        if (navContext.level === 'rows') return el.parent_id === navContext.sectorId;
        return true;
      });

      function overlapsAny(tx: number, ty: number) {
        const rect = (ax: number, ay: number, aw: number, ah: number) =>
          tx < ax + aw && tx + defaultW > ax && ty < ay + ah && ty + defaultH > ay;
        return existingCustomInScope.some(el => rect(el.grid_x, el.grid_y, el.grid_w, el.grid_h))
          || existingMapInScope.some(el => rect(el.grid_x, el.grid_y, el.grid_w, el.grid_h));
      }

      let gx = 1, gy = 1;
      outer: for (let row = 0; row < 50; row++) {
        for (let col = 0; col < 50; col++) {
          const tx = col * (defaultW + 1);
          const ty = row * (defaultH + 1);
          if (!overlapsAny(tx, ty)) { gx = tx; gy = ty; break outer; }
        }
      }

      const newEl: CustomElement = {
        id: `co-${Date.now()}-${Math.random()}`,
        object_type: type,
        label: label ?? '',
        color: color ?? '#3B82F6',
        grid_x: gx,
        grid_y: gy,
        grid_w: defaultW,
        grid_h: defaultH,
        nav_scope: parentKey.scope,
        nav_parent_id: parentKey.parentId,
      };

      dirtyRef.current = true;
      return { ...prev, customElements: [...prev.customElements, newEl] };
    });
  }, []);

  const updateCustomElement = useCallback((id: string, updates: Partial<CustomElement>) => {
    dirtyRef.current = true;
    setState(prev => ({
      ...prev,
      customElements: prev.customElements.map(el => el.id === id ? { ...el, ...updates } : el),
    }));
  }, []);

  const deleteCustomElement = useCallback((id: string) => {
    dirtyRef.current = true;
    setState(prev => ({
      ...prev,
      customElements: prev.customElements.filter(el => el.id !== id),
    }));
  }, []);

  const addWallElement = useCallback(({ points, closed, color }: { points: GridPoint[]; closed?: boolean; color?: string }, navContext: NavState) => {
    setState(prev => {
      const parentKey = navContext.level === 'zones' ? { scope: 'location', parentId: navContext.locationId ?? null }
        : navContext.level === 'sectors' ? { scope: 'zone', parentId: navContext.zoneId ?? null }
        : navContext.level === 'rows' ? { scope: 'sector', parentId: navContext.sectorId ?? null }
        : { scope: 'locations', parentId: null };

      const newWall: WallElement = {
        id: `wall-${Date.now()}-${Math.random()}`,
        points,
        closed: closed ?? false,
        color: color ?? '#475569',
        nav_scope: parentKey.scope,
        nav_parent_id: parentKey.parentId,
      };

      dirtyRef.current = true;
      return { ...prev, wallElements: [...prev.wallElements, newWall] };
    });
  }, []);

  const updateWallElement = useCallback((id: string, updates: Partial<WallElement>) => {
    dirtyRef.current = true;
    setState(prev => ({
      ...prev,
      wallElements: prev.wallElements.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
  }, []);

  const deleteWallElement = useCallback((id: string) => {
    dirtyRef.current = true;
    setState(prev => ({
      ...prev,
      wallElements: prev.wallElements.filter(w => w.id !== id),
    }));
  }, []);

  return {
    state,
    load,
    setMode,
    save,
    cancel,
    navigate,
    navTo,
    placeItem,
    updateMapElement,
    deleteMapElement,
    addCustomElement,
    updateCustomElement,
    deleteCustomElement,
    addWallElement,
    updateWallElement,
    deleteWallElement,
    isDirty: () => dirtyRef.current,
  };
}
