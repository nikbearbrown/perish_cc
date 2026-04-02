-- Depends on migration-001 (accounts), migration-002 (articles)

CREATE TABLE IF NOT EXISTS substack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) UNIQUE,
  access_token TEXT NOT NULL,
  publication_id TEXT NOT NULL,
  publication_name TEXT NOT NULL,
  substack_url TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS substack_export_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) UNIQUE,
  attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
