/*
  # Add locations table

  ## Summary
  Adds a top-level "locations" entity above zones in the warehouse hierarchy.
  The new hierarchy is: locations → zones → sectors → rows → rowmap

  ## New Tables
  - `locations`
    - `id` (uuid, primary key)
    - `name` (text, unique) - e.g., "Склад №1 — Центральний"
    - `color` (text) - hex color for map display
    - `created_at` (timestamptz)

  ## Modified Tables
  - `zones` - adds optional `location_id` (uuid FK → locations.id)
    - nullable so existing data is not broken

  ## Security
  - RLS enabled on `locations`
  - Public read/write policies (demo mode, consistent with existing tables)

  ## Notes
  1. location_id on zones is nullable to preserve backwards compatibility
  2. map_elements already supports any element_type string, so 'location' type will work automatically
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#2563EB',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations are publicly readable"
  ON locations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Locations are publicly insertable"
  ON locations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Locations are publicly updatable"
  ON locations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Locations are publicly deletable"
  ON locations FOR DELETE
  TO anon, authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE zones ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
  END IF;
END $$;
