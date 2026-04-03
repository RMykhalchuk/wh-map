import React, { useEffect, useState, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import { useWarehouseStore } from './hooks/useWarehouseStore';
import Breadcrumb from './components/Breadcrumb';
import Sidebar from './components/sidebar/Sidebar';
import MapGrid from './components/map/MapGrid';
import RowMap from './components/detail/RowMap';
import ukMessages from './i18n/uk';
import enMessages from './i18n/en';
import type { NavState, AppMode } from './types';

type Locale = 'uk' | 'en';
const LOCALE_KEY = 'warehouse_locale';
const localeMessages: Record<Locale, Record<string, string>> = { uk: ukMessages, en: enMessages };

function WarehouseApp() {
  const {
    state, load, setMode, save, cancel, navigate, navTo,
    placeItem, updateMapElement, deleteMapElement,
    addCustomElement, updateCustomElement, deleteCustomElement,
    addWallElement, updateWallElement, deleteWallElement,
  } = useWarehouseStore();

  const [hasChanges, setHasChanges] = useState(false);
  const [drawingWall, setDrawingWall] = useState(false);
  const [wallColor, setWallColor] = useState('#475569');
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  useEffect(() => { load(); }, [load]);

  const { loading, mode, nav, locations, zones, sectors, rows, shelves, cells, mapElements, customElements, wallElements } = state;

  const isRowMap = nav.level === 'rowmap';
  const isView = mode === 'view';

  useEffect(() => {
    if (isView) setDrawingWall(false);
  }, [isView]);

  const elementType = nav.level === 'locations' ? 'location'
    : nav.level === 'zones' ? 'zone'
    : nav.level === 'sectors' ? 'sector'
    : 'row' as const;

  const currentMapElements = useMemo(() =>
    (mapElements || []).filter(el => {
      if (el.element_type !== elementType) return false;
      if (nav.level === 'zones') return el.parent_id === nav.locationId;
      if (nav.level === 'sectors') return el.parent_id === nav.zoneId;
      if (nav.level === 'rows') return el.parent_id === nav.sectorId;
      return true;
    }),
    [mapElements, elementType, nav]
  );

  const currentCustomElements = useMemo(() => {
    if (!customElements) return [];
    const scope = nav.level === 'zones' ? 'location'
      : nav.level === 'sectors' ? 'zone'
      : nav.level === 'rows' ? 'sector'
      : 'locations';
    const parentId = nav.level === 'zones' ? nav.locationId ?? null
      : nav.level === 'sectors' ? nav.zoneId ?? null
      : nav.level === 'rows' ? nav.sectorId ?? null
      : null;
    return customElements.filter(el => el.nav_scope === scope && el.nav_parent_id === parentId);
  }, [customElements, nav]);

  const currentWallElements = useMemo(() => {
    if (!wallElements) return [];
    const scope = nav.level === 'zones' ? 'location'
      : nav.level === 'sectors' ? 'zone'
      : nav.level === 'rows' ? 'sector'
      : 'locations';
    const parentId = nav.level === 'zones' ? nav.locationId ?? null
      : nav.level === 'sectors' ? nav.zoneId ?? null
      : nav.level === 'rows' ? nav.sectorId ?? null
      : null;
    return wallElements.filter(w => w.nav_scope === scope && w.nav_parent_id === parentId);
  }, [wallElements, nav]);

  const placedIds = useMemo(() => new Set(currentMapElements.map(el => el.element_id)), [currentMapElements]);

  const currentItems = useMemo(() => {
    if (nav.level === 'locations') return locations;
    if (nav.level === 'zones') return zones.filter(z => z.location_id === nav.locationId);
    if (nav.level === 'sectors') return sectors.filter(sc => sc.zone_id === nav.zoneId);
    if (nav.level === 'rows') return rows.filter(r => r.sector_id === nav.sectorId);
    return [];
  }, [nav, locations, zones, sectors, rows]);

  function getChildCount(elementId: string): number {
    if (nav.level === 'locations') return zones.filter(z => z.location_id === elementId).length;
    if (nav.level === 'zones') return sectors.filter(sc => sc.zone_id === elementId).length;
    if (nav.level === 'sectors') return rows.filter(r => r.sector_id === elementId).length;
    return shelves.filter(sh => sh.row_id === elementId).length;
  }

  function getChildLabel(count: number): string {
    if (nav.level === 'locations') return count === 1 ? 'зона' : count >= 2 && count <= 4 ? 'зони' : 'зон';
    if (nav.level === 'zones') return count === 1 ? 'сектор' : count >= 2 && count <= 4 ? 'сектори' : 'секторів';
    if (nav.level === 'sectors') return count === 1 ? 'ряд' : count >= 2 && count <= 4 ? 'ряди' : 'рядів';
    return count === 1 ? 'стелаж' : count >= 2 && count <= 4 ? 'стелажі' : 'стелажів';
  }

  function getLabel(elementId: string): string {
    if (nav.level === 'locations') return locations.find(l => l.id === elementId)?.name ?? elementId;
    if (nav.level === 'zones') return zones.find(z => z.id === elementId)?.name ?? elementId;
    if (nav.level === 'sectors') return sectors.find(sc => sc.id === elementId)?.name ?? elementId;
    return rows.find(r => r.id === elementId)?.name ?? elementId;
  }

  const gridItems = currentMapElements.map(el => {
    const count = getChildCount(el.element_id);
    return {
      mapElement: el,
      label: getLabel(el.element_id),
      childCount: count,
      childLabel: getChildLabel(count),
    };
  });

  function getBreadcrumbItems() {
    const goLocations = () => navTo({ level: 'locations' });
    const items = [{ label: 'Склади', onClick: goLocations }];

    if (['zones', 'sectors', 'rows', 'rowmap'].includes(nav.level)) {
      items.push({
        label: nav.locationName ?? 'Склад',
        onClick: () => navTo({ level: 'zones', locationId: nav.locationId, locationName: nav.locationName }),
      });
    }
    if (['sectors', 'rows', 'rowmap'].includes(nav.level)) {
      items.push({
        label: nav.zoneName ?? 'Зона',
        onClick: () => navTo({ level: 'sectors', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName }),
      });
    }
    if (['rows', 'rowmap'].includes(nav.level)) {
      items.push({
        label: nav.sectorName ?? 'Сектор',
        onClick: () => navTo({ level: 'rows', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName, sectorId: nav.sectorId, sectorName: nav.sectorName }),
      });
    }
    if (nav.level === 'rowmap') {
      items.push({ label: nav.rowName ?? 'Ряд', onClick: () => {} });
    }
    return items;
  }

  function handleModeChange(newMode: AppMode) {
    if (newMode === 'edit') setHasChanges(false);
    setMode(newMode);
  }

  function handleSave() {
    setHasChanges(false);
    save();
  }

  function handleCancel() {
    setHasChanges(false);
    cancel();
  }

  function getMapLevelLabel(): string {
    if (nav.level === 'locations') return 'Склади';
    if (nav.level === 'zones') return 'Зони';
    if (nav.level === 'sectors') return 'Сектори';
    if (nav.level === 'rows') return 'Ряди';
    if (nav.level === 'rowmap') return 'Комірки';
    return '';
  }

  function getMapBreadcrumbChips(): Array<{ label: string; onClick: () => void }> {
    const chips: Array<{ label: string; onClick: () => void }> = [];
    if (nav.level === 'zones' && nav.locationName) {
      chips.push({ label: `Склад: ${nav.locationName}`, onClick: () => navTo({ level: 'locations' }) });
    }
    if (nav.level === 'sectors') {
      if (nav.zoneName) chips.push({ label: `Зона: ${nav.zoneName}`, onClick: () => navTo({ level: 'zones', locationId: nav.locationId, locationName: nav.locationName }) });
      if (nav.locationName) chips.push({ label: `Склад: ${nav.locationName}`, onClick: () => navTo({ level: 'locations' }) });
    }
    if (nav.level === 'rows') {
      if (nav.sectorName) chips.push({ label: `Сектор: ${nav.sectorName}`, onClick: () => navTo({ level: 'sectors', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName }) });
      if (nav.zoneName) chips.push({ label: `Зона: ${nav.zoneName}`, onClick: () => navTo({ level: 'zones', locationId: nav.locationId, locationName: nav.locationName }) });
      if (nav.locationName) chips.push({ label: `Склад: ${nav.locationName}`, onClick: () => navTo({ level: 'locations' }) });
    }
    if (nav.level === 'rowmap') {
      if (nav.rowName) chips.push({ label: `Ряд: ${nav.rowName}`, onClick: () => navTo({ level: 'rows', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName, sectorId: nav.sectorId, sectorName: nav.sectorName }) });
      if (nav.sectorName) chips.push({ label: `Сектор: ${nav.sectorName}`, onClick: () => navTo({ level: 'sectors', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName }) });
      if (nav.zoneName) chips.push({ label: `Зона: ${nav.zoneName}`, onClick: () => navTo({ level: 'zones', locationId: nav.locationId, locationName: nav.locationName }) });
      if (nav.locationName) chips.push({ label: `Склад: ${nav.locationName}`, onClick: () => navTo({ level: 'locations' }) });
    }
    return chips;
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const mapLevelLabel = getMapLevelLabel();
  const mapChips = getMapBreadcrumbChips();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex flex-col flex-1 overflow-hidden">
        <Breadcrumb
          levelLabel={mapLevelLabel}
          chips={mapChips}
          mode={isRowMap ? null : mode}
          hasChanges={hasChanges}
          onModeChange={handleModeChange}
          onSave={handleSave}
          onCancel={handleCancel}
          showInfo={isRowMap}
        />

        <div className="flex flex-1 overflow-hidden">
          {!isRowMap && (
            <>
              {!isView && (
                <Sidebar
                  level={nav.level}
                  items={currentItems}
                  placedIds={placedIds}
                  onDragStart={() => {}}
                  onItemClick={(item) => {
                    if (placedIds.has(item.id)) return;
                    setHasChanges(true);
                    placeItem(item, null, null);
                  }}
                  drawingWall={drawingWall}
                  wallColor={wallColor}
                  onToggleDrawWall={() => setDrawingWall(v => !v)}
                  onWallColorChange={setWallColor}
                  onAddBlock={() => setShowBlockDialog(true)}
                />
              )}

              <div className="flex flex-col flex-1 overflow-hidden border border-slate-200 rounded-md m-4">
                <MapGrid
                  navKey={[nav.level, nav.locationId, nav.zoneId, nav.sectorId].filter(Boolean).join(':')}
                  items={gridItems}
                  customItems={currentCustomElements}
                  wallItems={currentWallElements}
                  readonly={isView}
                  drawingWall={drawingWall}
                  wallColor={wallColor}
                  showBlockDialog={showBlockDialog}
                  onBlockDialogClose={() => setShowBlockDialog(false)}
                  onDrop={(elementId, gridX, gridY) => {
                    const allItems = [...locations, ...zones, ...sectors, ...rows];
                    const item = allItems.find(i => String(i.id) === String(elementId));
                    if (item) { setHasChanges(true); placeItem(item, gridX, gridY); }
                  }}
                  onUpdate={(id, updates) => { setHasChanges(true); updateMapElement(id, updates); }}
                  onDelete={(id) => { setHasChanges(true); deleteMapElement(id); }}
                  onNavigate={(elementId) => {
                    if (!isView && nav.level === 'rows') return;
                    navigate(elementId);
                  }}
                  onCustomAdd={(opts) => { setHasChanges(true); addCustomElement(opts, nav); }}
                  onCustomUpdate={(id, updates) => { setHasChanges(true); updateCustomElement(id, updates); }}
                  onCustomDelete={(id) => { setHasChanges(true); deleteCustomElement(id); }}
                  onWallAdd={(opts) => { setHasChanges(true); addWallElement(opts, nav); }}
                  onWallUpdate={(id, updates) => { setHasChanges(true); updateWallElement(id, updates); }}
                  onWallDelete={(id) => { setHasChanges(true); deleteWallElement(id); }}
                  onWallCommit={() => setDrawingWall(false)}
                  onWallCancel={() => setDrawingWall(false)}
                />
              </div>
            </>
          )}

          {isRowMap && (
            <RowMap
              rowId={nav.rowId ?? ''}
              rowName={nav.rowName ?? 'Ряд'}
              shelves={shelves}
              cells={cells}
              navChips={[
                ...(nav.sectorName ? [{ label: `Сектор: ${nav.sectorName}`, onClick: () => navTo({ level: 'sectors', locationId: nav.locationId, locationName: nav.locationName, zoneId: nav.zoneId, zoneName: nav.zoneName }) }] : []),
                ...(nav.zoneName ? [{ label: `Зона: ${nav.zoneName}`, onClick: () => navTo({ level: 'zones', locationId: nav.locationId, locationName: nav.locationName }) }] : []),
                ...(nav.locationName ? [{ label: `Склад: ${nav.locationName}`, onClick: () => navTo({ level: 'locations' }) }] : []),
              ]}
              onBack={() => navTo({
                level: 'rows',
                locationId: nav.locationId,
                locationName: nav.locationName,
                zoneId: nav.zoneId,
                zoneName: nav.zoneName,
                sectorId: nav.sectorId,
                sectorName: nav.sectorName,
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [locale] = React.useState<Locale>(() => {
    const saved = localStorage.getItem(LOCALE_KEY);
    return (saved === 'uk' || saved === 'en') ? saved : 'uk';
  });

  return (
    <IntlProvider locale={locale} messages={localeMessages[locale]}>
      <WarehouseApp />
    </IntlProvider>
  );
}
