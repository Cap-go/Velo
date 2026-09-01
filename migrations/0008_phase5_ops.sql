-- Phase 5: team roles, notes, triggers

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at INTEGER NOT NULL,
  UNIQUE(owner_user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

CREATE TABLE IF NOT EXISTS entity_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('program', 'traffic_source', 'network', 'offer', 'lander', 'group')
  ),
  entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_notes_entity ON entity_notes(user_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS triggers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  program_id TEXT REFERENCES programs(id),
  name TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('conversion', 'click')),
  action_type TEXT NOT NULL CHECK (action_type IN ('webhook')),
  action_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_triggers_user ON triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_triggers_program ON triggers(program_id);
