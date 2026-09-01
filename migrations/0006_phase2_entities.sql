-- Phase 2: Binom-style entity tables

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_groups_user ON groups(user_id);

CREATE TABLE IF NOT EXISTS traffic_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  cost_type TEXT NOT NULL DEFAULT 'cpc' CHECK (cost_type IN ('cpc', 'cpm', 'cpa')),
  default_cost_cents INTEGER NOT NULL DEFAULT 0,
  postback_percent INTEGER NOT NULL DEFAULT 100,
  s2s_postback_url TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_traffic_sources_user ON traffic_sources(user_id);

CREATE TABLE IF NOT EXISTS affiliate_networks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  postback_url_template TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_affiliate_networks_user ON affiliate_networks(user_id);

CREATE TABLE IF NOT EXISTS landers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_landers_user ON landers(user_id);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  network_id TEXT REFERENCES affiliate_networks(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  payout_cents INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offers_user ON offers(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_network ON offers(network_id);

-- Campaign fields on programs (programs = campaigns in Capve)
ALTER TABLE programs ADD COLUMN campaign_key TEXT;
ALTER TABLE programs ADD COLUMN group_id TEXT REFERENCES groups(id);
ALTER TABLE programs ADD COLUMN traffic_source_id TEXT REFERENCES traffic_sources(id);
ALTER TABLE programs ADD COLUMN tags TEXT;
ALTER TABLE programs ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_campaign_key ON programs(user_id, campaign_key);
