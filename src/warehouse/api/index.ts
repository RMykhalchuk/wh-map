import type { MapElement, CustomElement, WallElement, WarehouseState } from '../types';
import { LOCATIONS, ZONES, SECTORS, ROWS, SHELVES, CELLS } from '../data/fixtures';
import { INITIAL_MAP_ELEMENTS, INITIAL_CUSTOM_ELEMENTS, INITIAL_WALL_ELEMENTS } from '../data/fixtures';

let mapElements: MapElement[] = INITIAL_MAP_ELEMENTS.map(el => ({ ...el }));
let nextId = 1;

function genId(): string {
  return `me-${nextId++}`;
}

let customElements: CustomElement[] = INITIAL_CUSTOM_ELEMENTS.map(el => ({ ...el }));
let wallElements: WallElement[] = INITIAL_WALL_ELEMENTS.map(el => ({ ...el, points: el.points.map(p => ({ ...p })) }));

export function createApi() {
  async function fetchAll(): Promise<Omit<WarehouseState, 'loading' | 'mode' | 'nav'>> {
    return {
      locations: LOCATIONS,
      zones: ZONES,
      sectors: SECTORS,
      rows: ROWS,
      shelves: SHELVES,
      cells: CELLS,
      mapElements: [...mapElements],
      customElements: [...customElements],
      wallElements: [...wallElements],
    };
  }

  async function addMapElement(element: MapElement): Promise<{ data: MapElement; error: null }> {
    const newEl = { ...element, id: genId() };
    mapElements.push(newEl);
    return { data: newEl, error: null };
  }

  async function updateMapElement(id: string, updates: Partial<MapElement>): Promise<{ data: MapElement | null; error: string | null }> {
    const idx = mapElements.findIndex(el => el.id === id);
    if (idx === -1) return { data: null, error: 'Not found' };
    mapElements[idx] = { ...mapElements[idx], ...updates };
    return { data: mapElements[idx], error: null };
  }

  async function deleteMapElement(id: string): Promise<{ error: null }> {
    mapElements = mapElements.filter(el => el.id !== id);
    return { error: null };
  }

  return { fetchAll, addMapElement, updateMapElement, deleteMapElement };
}
