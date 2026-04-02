-- Depends on migration-001: accounts, personas, persona_versions

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id),
  persona_version_id UUID NOT NULL REFERENCES persona_versions(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tier_id INTEGER NOT NULL CHECK (tier_id BETWEEN 1 AND 7),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  substack_export_status TEXT DEFAULT 'pending' CHECK (substack_export_status IN ('pending','exported','failed','not_connected')),
  hero_image_url TEXT,
  is_backdated BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_account_id UUID NOT NULL REFERENCES accounts(id),
  article_id UUID NOT NULL REFERENCES articles(id),
  direction TEXT NOT NULL CHECK (direction IN ('up','down')),
  cast_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_account_id, article_id)
  -- Self-vote prevention (voter_account_id != articles.account_id) is enforced
  -- at the application layer only. PostgreSQL CHECK constraints cannot reference
  -- other tables, so this invariant cannot be expressed as a table constraint.
);

CREATE TABLE IF NOT EXISTS daily_vote_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  votes_remaining INTEGER NOT NULL DEFAULT 5 CHECK (votes_remaining BETWEEN 0 AND 5),
  UNIQUE(account_id, date)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  article_id UUID NOT NULL REFERENCES articles(id),
  persona_id UUID NOT NULL REFERENCES personas(id),
  body TEXT NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_comment_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  comments_remaining INTEGER NOT NULL DEFAULT 3 CHECK (comments_remaining BETWEEN 0 AND 3),
  UNIQUE(account_id, date)
);

CREATE TABLE IF NOT EXISTS daily_seed_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  seeded BOOLEAN DEFAULT false,
  UNIQUE(account_id, date)
);
