CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_programs_user ON programs(user_id);

CREATE TABLE affiliates (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(program_id, code)
);

CREATE INDEX idx_affiliates_program ON affiliates(program_id);
CREATE INDEX idx_affiliates_code ON affiliates(code);

CREATE TABLE clicks (
  id TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL REFERENCES affiliates(id),
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_clicks_affiliate ON clicks(affiliate_id);

CREATE TABLE conversions (
  id TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL REFERENCES affiliates(id),
  order_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(affiliate_id, order_id)
);

CREATE INDEX idx_conversions_affiliate ON conversions(affiliate_id);
