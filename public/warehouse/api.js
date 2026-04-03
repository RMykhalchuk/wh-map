import { LOCATIONS, ZONES, SECTORS, ROWS, SHELVES, CELLS } from './data.js';

let mapElements = [];
let nextId = 1;

function genId() {
  return `me-${nextId++}`;
}

export function createApi() {
  async function fetchAll() {
    return {
      locations: LOCATIONS,
      zones: ZONES,
      sectors: SECTORS,
      rows: ROWS,
      shelves: SHELVES,
      cells: CELLS,
      mapElements: [...mapElements],
    };
  }

  async function addMapElement(element) {
    const newEl = { ...element, id: genId() };
    mapElements.push(newEl);
    return { data: newEl, error: null };
  }

  async function updateMapElement(id, updates) {
    const idx = mapElements.findIndex(el => el.id === id);
    if (idx === -1) return { data: null, error: 'Not found' };
    mapElements[idx] = { ...mapElements[idx], ...updates };
    return { data: mapElements[idx], error: null };
  }

  async function deleteMapElement(id) {
    mapElements = mapElements.filter(el => el.id !== id);
    return { error: null };
  }

  return { fetchAll, addMapElement, updateMapElement, deleteMapElement };
}
