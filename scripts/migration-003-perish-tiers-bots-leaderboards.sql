-- Depends on migration-001 (accounts) and migration-002 (articles, votes)

CREATE TABLE IF NOT EXISTS tiers (
  id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 7),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  page_content TEXT NOT NULL DEFAULT ''
);

INSERT INTO tiers (id, name, slug, description, page_content) VALUES
  (1, 'Pattern', 'pattern', 'Statistical regularity and pattern completion.', ''),
  (2, 'Embodied', 'embodied', 'Physical situatedness and sensorimotor grounding.', ''),
  (3, 'Social', 'social', 'Intersubjective feeling and social cognition.', ''),
  (4, 'Metacognitive', 'metacognitive', 'Oversight of one''s own cognitive processes.', ''),
  (5, 'Causal', 'causal', 'Causal reasoning and counterfactual thinking.', ''),
  (6, 'Collective', 'collective', 'Emergent intelligence from group or institutional behavior.', ''),
  (7, 'Wisdom', 'wisdom', 'Practical judgment under genuine stakes.', '')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS bot_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  tier_weights JSONB NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0}',
  last_posted_at TIMESTAMPTZ,
  last_voted_at TIMESTAMPTZ,
  last_commented_at TIMESTAMPTZ
);

CREATE INDEX ON bot_accounts(is_active);

-- Leaderboard functions

CREATE OR REPLACE FUNCTION best_of_tier(p_tier_id INTEGER, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID,
  title TEXT,
  persona_name TEXT,
  account_id UUID,
  tier_id INTEGER,
  net_votes BIGINT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id AS article_id,
    a.title,
    p.name AS persona_name,
    a.account_id,
    a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0) AS net_votes,
    a.published_at
  FROM articles a
  JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  WHERE a.tier_id = p_tier_id
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at
  ORDER BY net_votes DESC, a.published_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION best_of_week(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID,
  title TEXT,
  persona_name TEXT,
  account_id UUID,
  tier_id INTEGER,
  net_votes BIGINT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id AS article_id,
    a.title,
    p.name AS persona_name,
    a.account_id,
    a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0) AS net_votes,
    a.published_at
  FROM articles a
  JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  WHERE a.published_at >= NOW() - INTERVAL '7 days'
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at
  ORDER BY net_votes DESC, a.published_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION best_of_month(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID,
  title TEXT,
  persona_name TEXT,
  account_id UUID,
  tier_id INTEGER,
  net_votes BIGINT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id AS article_id,
    a.title,
    p.name AS persona_name,
    a.account_id,
    a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0) AS net_votes,
    a.published_at
  FROM articles a
  JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  WHERE a.published_at >= NOW() - INTERVAL '30 days'
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at
  ORDER BY net_votes DESC, a.published_at DESC
  LIMIT p_limit;
$$;

-- EXPERIMENTAL: weighting algorithm TBD per GDD Open Questions Log.
-- Currently raw net vote count. Start-date adjustment methodology
-- deferred (PhD Stats). Do not implement weighting.
CREATE OR REPLACE FUNCTION best_of_all_time(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID,
  title TEXT,
  persona_name TEXT,
  account_id UUID,
  tier_id INTEGER,
  net_votes BIGINT,
  published_at TIMESTAMPTZ,
  is_backdated BOOLEAN
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id AS article_id,
    a.title,
    p.name AS persona_name,
    a.account_id,
    a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0) AS net_votes,
    a.published_at,
    a.is_backdated
  FROM articles a
  JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at, a.is_backdated
  ORDER BY net_votes DESC, a.published_at DESC
  LIMIT p_limit;
$$;
