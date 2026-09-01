-- Phase 3: campaign paths and rotation modes

CREATE TABLE IF NOT EXISTS rotations (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL UNIQUE REFERENCES programs(id),
  mode TEXT NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal', 'smart', 'fix_on', 'top_to_bottom')),
  fixed_path_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rotations_program ON rotations(program_id);

CREATE TABLE IF NOT EXISTS paths (
  id TEXT PRIMARY KEY,
  rotation_id TEXT NOT NULL REFERENCES rotations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('direct', 'lander', 'lander_offer', 'offer')),
  weight INTEGER NOT NULL DEFAULT 100,
  sort_order INTEGER NOT NULL DEFAULT 0,
  direct_url TEXT,
  lander_id TEXT REFERENCES landers(id),
  offer_id TEXT REFERENCES offers(id),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paths_rotation ON paths(rotation_id);

CREATE TABLE IF NOT EXISTS visitor_assignments (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id),
  visitor_key TEXT NOT NULL,
  path_id TEXT NOT NULL REFERENCES paths(id),
  created_at INTEGER NOT NULL,
  UNIQUE(program_id, visitor_key)
);

CREATE INDEX IF NOT EXISTS idx_visitor_assignments_program ON visitor_assignments(program_id);

ALTER TABLE clicks ADD COLUMN path_id TEXT REFERENCES paths(id);
ALTER TABLE clicks ADD COLUMN lander_id TEXT REFERENCES landers(id);
ALTER TABLE clicks ADD COLUMN offer_id TEXT REFERENCES offers(id);
