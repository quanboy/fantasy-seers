-- Remove unused badge system and user.is_public field
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
ALTER TABLE users DROP COLUMN IF EXISTS is_public;
