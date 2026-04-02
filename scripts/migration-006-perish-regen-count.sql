-- Add regeneration tracking to daily_seed_state
ALTER TABLE daily_seed_state ADD COLUMN IF NOT EXISTS regen_count INTEGER DEFAULT 0;
