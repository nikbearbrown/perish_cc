-- Add intended_vote_time for bot vote timing analytics
ALTER TABLE votes ADD COLUMN IF NOT EXISTS intended_vote_time TIMESTAMPTZ DEFAULT NOW();
