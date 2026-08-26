-- Global unique affiliate codes, program-scoped conversion idempotency, convert secret
ALTER TABLE programs ADD COLUMN convert_secret TEXT;

CREATE TABLE affiliates_new (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

INSERT INTO affiliates_new (id, program_id, name, code, created_at)
SELECT id, program_id, name, code, created_at FROM affiliates;

DROP TABLE affiliates;
ALTER TABLE affiliates_new RENAME TO affiliates;

CREATE INDEX idx_affiliates_program ON affiliates(program_id);
CREATE INDEX idx_affiliates_code ON affiliates(code);

CREATE TABLE conversions_new (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id),
  affiliate_id TEXT NOT NULL REFERENCES affiliates(id),
  order_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(program_id, order_id)
);

INSERT INTO conversions_new (id, program_id, affiliate_id, order_id, amount_cents, created_at)
SELECT c.id, a.program_id, c.affiliate_id, c.order_id, c.amount_cents, c.created_at
FROM conversions c
JOIN affiliates a ON c.affiliate_id = a.id;

DROP TABLE conversions;
ALTER TABLE conversions_new RENAME TO conversions;

CREATE INDEX idx_conversions_affiliate ON conversions(affiliate_id);
CREATE INDEX idx_conversions_program ON conversions(program_id);
