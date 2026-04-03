export interface Location {
  id: string;
  name: string;
  color: string;
}

export interface Zone {
  id: string;
  location_id: string;
  name: string;
  color: string;
}

export interface Sector {
  id: string;
  zone_id: string;
  name: string;
  color: string;
}

export interface Row {
  id: string;
  sector_id: string;
  name: string;
  color: string;
}

export interface Shelf {
  id: string;
  row_id: string;
  name: string;
  position: number;
}

export interface ContentItem {
  id: string;
  name: string;
  quantity: number;
  updated_at: string;
}

export interface Cell {
  id: string;
  shelf_id: string;
  row_id: string;
  code: string;
  floor: number;
  position: number;
  status: 'occupied' | 'free' | 'reserved' | 'blocked';
  cell_type: 'standard' | 'heavy' | 'cold' | 'hazardous';
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  max_weight_kg: number;
  current_weight_kg: number;
  max_volume_m2: number;
  current_volume_m2: number;
  contents: ContentItem[];
}

export interface MapElement {
  id: string;
  element_type: 'location' | 'zone' | 'sector' | 'row';
  element_id: string;
  parent_id: string | null;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  color: string;
}

export interface CustomElement {
  id: string;
  object_type: string;
  label: string;
  color: string;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  nav_scope: string;
  nav_parent_id: string | null;
}

export interface GridPoint {
  x: number;
  y: number;
}

export interface WallElement {
  id: string;
  points: GridPoint[];
  closed: boolean;
  color: string;
  nav_scope: string;
  nav_parent_id: string | null;
}

export type NavLevel = 'locations' | 'zones' | 'sectors' | 'rows' | 'rowmap';

export interface NavState {
  level: NavLevel;
  locationId?: string;
  locationName?: string;
  zoneId?: string;
  zoneName?: string;
  sectorId?: string;
  sectorName?: string;
  rowId?: string;
  rowName?: string;
}

export type AppMode = 'view' | 'edit';

export interface WarehouseState {
  locations: Location[];
  zones: Zone[];
  sectors: Sector[];
  rows: Row[];
  shelves: Shelf[];
  cells: Cell[];
  mapElements: MapElement[];
  customElements: CustomElement[];
  wallElements: WallElement[];
  loading: boolean;
  mode: AppMode;
  nav: NavState;
}

export interface GridItem {
  mapElement: MapElement;
  label: string;
  childCount: number;
  childLabel: string;
}

export type ResizeDir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
