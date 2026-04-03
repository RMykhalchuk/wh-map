/*
  # Add Shelves and Cells tables

  ## Overview
  Extends warehouse schema with shelf and cell-level granularity within rows.

  ## New Tables

  ### shelves
  - `id` (uuid, primary key)
  - `row_id` (uuid, foreign key to rows)
  - `name` (text) - Shelf display name, e.g. "СТ 01"
  - `position` (int) - Order of shelf within the row
  - `created_at` (timestamptz)

  ### cells
  - `id` (uuid, primary key)
  - `shelf_id` (uuid, foreign key to shelves)
  - `row_id` (uuid, foreign key to rows)
  - `code` (text) - Cell code, e.g. "A11-02-05-03"
  - `floor` (int) - Floor/level number (П 01, П 02 ...)
  - `position` (int) - Position on shelf (01, 02, 03 ...)
  - `status` (text) - 'free' | 'occupied' | 'reserved' | 'blocked'
  - `cell_type` (text) - 'standard' | 'heavy' | 'cold' | 'hazardous'
  - `width_cm` (int) - Width in cm
  - `depth_cm` (int) - Depth in cm
  - `height_cm` (int) - Height in cm
  - `max_weight_kg` (numeric) - Max weight capacity in kg
  - `current_weight_kg` (numeric) - Current weight load in kg
  - `max_volume_m2` (numeric) - Max volume capacity
  - `current_volume_m2` (numeric) - Current volume used
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all new tables
  - Public read/write for anonymous and authenticated users (demo)
*/

CREATE TABLE IF NOT EXISTS shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id uuid NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  row_id uuid NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
  code text NOT NULL,
  floor int NOT NULL DEFAULT 1,
  position int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved', 'blocked')),
  cell_type text NOT NULL DEFAULT 'standard' CHECK (cell_type IN ('standard', 'heavy', 'cold', 'hazardous')),
  width_cm int NOT NULL DEFAULT 100,
  depth_cm int NOT NULL DEFAULT 80,
  height_cm int NOT NULL DEFAULT 200,
  max_weight_kg numeric NOT NULL DEFAULT 500,
  current_weight_kg numeric NOT NULL DEFAULT 0,
  max_volume_m2 numeric NOT NULL DEFAULT 200,
  current_volume_m2 numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read shelves"
  ON shelves FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert shelves"
  ON shelves FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update shelves"
  ON shelves FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete shelves"
  ON shelves FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow public read cells"
  ON cells FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert cells"
  ON cells FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update cells"
  ON cells FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete cells"
  ON cells FOR DELETE TO anon, authenticated USING (true);
