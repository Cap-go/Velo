ALTER TABLE users ADD COLUMN is_platform_admin INTEGER NOT NULL DEFAULT 0;

UPDATE users SET is_platform_admin = 1 WHERE email = 'martindonadieu@gmail.com';
