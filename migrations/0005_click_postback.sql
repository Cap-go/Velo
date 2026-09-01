ALTER TABLE clicks ADD COLUMN program_id TEXT REFERENCES programs(id);
ALTER TABLE clicks ADD COLUMN ip TEXT;
ALTER TABLE clicks ADD COLUMN user_agent TEXT;

ALTER TABLE conversions ADD COLUMN click_id TEXT REFERENCES clicks(id);
ALTER TABLE conversions ADD COLUMN status TEXT NOT NULL DEFAULT 'lead';
ALTER TABLE conversions ADD COLUMN status2 TEXT;
ALTER TABLE conversions ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE programs ADD COLUMN s2s_postback_url TEXT;

CREATE INDEX IF NOT EXISTS idx_clicks_program ON clicks(program_id);
CREATE INDEX IF NOT EXISTS idx_conversions_click ON conversions(click_id);
