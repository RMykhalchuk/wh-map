/*
  # Warehouse Map Schema

  ## Overview
  Creates tables for warehouse interactive map with 3-level hierarchy:
  zones -> sectors -> rows

  ## New Tables

  ### zones
  - `id` (uuid, primary key)
  - `name` (text) - Zone display name
  - `color` (text) - Hex color for the zone on the map
  - `created_at` (timestamptz)

  ### sectors
  - `id` (uuid, primary key)
  - `zone_id` (uuid, foreign key to zones)
  - `name` (text) - Sector display name
  - `color` (text) - Hex color for the sector
  - `created_at` (timestamptz)

  ### rows
  - `id` (uuid, primary key)
  - `sector_id` (uuid, foreign key to sectors)
  - `name` (text) - Row display name
  - `color` (text) - Hex color for the row
  - `created_at` (timestamptz)

  ### map_elements
  - `id` (uuid, primary key)
  - `element_type` (text) - 'zone' | 'sector' | 'row'
  - `element_id` (uuid) - References the actual zone/sector/row
  - `parent_id` (uuid, nullable) - Parent zone_id for sectors, sector_id for rows
  - `grid_x` (int) - X position on grid
  - `grid_y` (int) - Y position on grid
  - `grid_w` (int) - Width in grid cells
  - `grid_h` (int) - Height in grid cells
  - `color` (text) - Override color on map
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Public read/write access for demo purposes (anonymous users)
*/

CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#10B981',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#F59E0B',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS map_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_type text NOT NULL CHECK (element_type IN ('zone', 'sector', 'row')),
  element_id uuid NOT NULL,
  parent_id uuid,
  grid_x int NOT NULL DEFAULT 0,
  grid_y int NOT NULL DEFAULT 0,
  grid_w int NOT NULL DEFAULT 3,
  grid_h int NOT NULL DEFAULT 2,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read zones"
  ON zones FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert zones"
  ON zones FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update zones"
  ON zones FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete zones"
  ON zones FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read sectors"
  ON sectors FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert sectors"
  ON sectors FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update sectors"
  ON sectors FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete sectors"
  ON sectors FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read rows"
  ON rows FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert rows"
  ON rows FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update rows"
  ON rows FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete rows"
  ON rows FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read map_elements"
  ON map_elements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert map_elements"
  ON map_elements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update map_elements"
  ON map_elements FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete map_elements"
  ON map_elements FOR DELETE
  TO anon, authenticated
  USING (true);

-- Seed test data
INSERT INTO zones (id, name, color) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Зона A — Холодне зберігання', '#3B82F6'),
  ('11111111-1111-1111-1111-111111111102', 'Зона B — Сухе зберігання', '#10B981'),
  ('11111111-1111-1111-1111-111111111103', 'Зона C — Небезпечні матеріали', '#EF4444'),
  ('11111111-1111-1111-1111-111111111104', 'Зона D — Великогабаритні товари', '#F59E0B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sectors (id, zone_id, name, color) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'Сектор A1', '#60A5FA'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', 'Сектор A2', '#93C5FD'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'Сектор A3', '#BFDBFE'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102', 'Сектор B1', '#34D399'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111102', 'Сектор B2', '#6EE7B7'),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111103', 'Сектор C1', '#F87171'),
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111103', 'Сектор C2', '#FCA5A5'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111104', 'Сектор D1', '#FCD34D')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rows (id, sector_id, name, color) VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Ряд A1-1', '#DBEAFE'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'Ряд A1-2', '#DBEAFE'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 'Ряд A1-3', '#DBEAFE'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222202', 'Ряд A2-1', '#EFF6FF'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222202', 'Ряд A2-2', '#EFF6FF'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222204', 'Ряд B1-1', '#D1FAE5'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222204', 'Ряд B1-2', '#D1FAE5'),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222204', 'Ряд B1-3', '#D1FAE5'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222205', 'Ряд B2-1', '#ECFDF5'),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222206', 'Ряд C1-1', '#FEE2E2'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222206', 'Ряд C1-2', '#FEE2E2')
ON CONFLICT (id) DO NOTHING;
