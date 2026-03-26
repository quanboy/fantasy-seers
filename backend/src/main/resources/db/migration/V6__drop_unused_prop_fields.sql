-- Remove unused stat-based resolution fields from props
ALTER TABLE props DROP COLUMN IF EXISTS game_id;
ALTER TABLE props DROP COLUMN IF EXISTS stat_key;
ALTER TABLE props DROP COLUMN IF EXISTS stat_threshold;
ALTER TABLE props DROP COLUMN IF EXISTS stat_direction;
