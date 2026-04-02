CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_account_id UUID NOT NULL REFERENCES accounts(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('article','comment')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_account_id, content_type, content_id)
);
