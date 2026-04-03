-- ============================================================
-- PERISH: ALL MIGRATIONS (001–012) + TIER SEED
-- Paste into Neon SQL Editor and run.
-- Safe to re-run — all statements are idempotent.
-- ============================================================

-- ============================================================
-- MIGRATION 001: accounts, personas, persona_versions
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  byline_enabled BOOLEAN DEFAULT false,
  byline_text TEXT,
  byline_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persona_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_version_per_persona ON persona_versions(persona_id) WHERE is_active = true;

-- ============================================================
-- MIGRATION 002: articles, votes, comments, daily state
-- ============================================================

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

-- ============================================================
-- MIGRATION 003: tiers, bot_accounts, leaderboard functions
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_bot_accounts_active ON bot_accounts(is_active);

CREATE OR REPLACE FUNCTION best_of_tier(p_tier_id INTEGER, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID, title TEXT, persona_name TEXT, account_id UUID,
  tier_id INTEGER, net_votes BIGINT, published_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT a.id, a.title, p.name, a.account_id, a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0),
    a.published_at
  FROM articles a JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  WHERE a.tier_id = p_tier_id
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at
  ORDER BY 6 DESC, a.published_at DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION best_of_week(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID, title TEXT, persona_name TEXT, account_id UUID,
  tier_id INTEGER, net_votes BIGINT, published_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT a.id, a.title, p.name, a.account_id, a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0),
    a.published_at
  FROM articles a JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  WHERE a.published_at >= NOW() - INTERVAL '7 days'
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at
  ORDER BY 6 DESC, a.published_at DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION best_of_month(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID, title TEXT, persona_name TEXT, account_id UUID,
  tier_id INTEGER, net_votes BIGINT, published_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT a.id, a.title, p.name, a.account_id, a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0),
    a.published_at
  FROM articles a JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  WHERE a.published_at >= NOW() - INTERVAL '30 days'
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at
  ORDER BY 6 DESC, a.published_at DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION best_of_all_time(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  article_id UUID, title TEXT, persona_name TEXT, account_id UUID,
  tier_id INTEGER, net_votes BIGINT, published_at TIMESTAMPTZ, is_backdated BOOLEAN
) LANGUAGE sql STABLE AS $$
  SELECT a.id, a.title, p.name, a.account_id, a.tier_id,
    COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 END), 0),
    a.published_at, a.is_backdated
  FROM articles a JOIN personas p ON p.id = a.persona_id
  LEFT JOIN votes v ON v.article_id = a.id
  GROUP BY a.id, a.title, p.name, a.account_id, a.tier_id, a.published_at, a.is_backdated
  ORDER BY 6 DESC, a.published_at DESC LIMIT p_limit;
$$;

-- ============================================================
-- MIGRATION 004: password_resets
-- ============================================================

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION 005: Substack integration
-- ============================================================

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

-- ============================================================
-- MIGRATION 006: regen_count on daily_seed_state
-- ============================================================

ALTER TABLE daily_seed_state ADD COLUMN IF NOT EXISTS regen_count INTEGER DEFAULT 0;

-- ============================================================
-- MIGRATION 007: bot persona template (no data yet)
-- ============================================================
-- Bot personas will be inserted when editorial approval is complete.
-- See scripts/migration-007-perish-bot-personas.sql for the template.

-- ============================================================
-- MIGRATION 008: vote timing analytics
-- ============================================================

ALTER TABLE votes ADD COLUMN IF NOT EXISTS intended_vote_time TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- MIGRATION 009: content flags
-- ============================================================

CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_account_id UUID NOT NULL REFERENCES accounts(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('article','comment')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_account_id, content_type, content_id)
);

-- ============================================================
-- MIGRATION 010: performance indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_articles_published_at_desc ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tier_id ON articles(tier_id);
CREATE INDEX IF NOT EXISTS idx_articles_account_id ON articles(account_id);
CREATE INDEX IF NOT EXISTS idx_articles_persona_id ON articles(persona_id);
CREATE INDEX IF NOT EXISTS idx_votes_article_id ON votes(article_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_account_id ON votes(voter_account_id);
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_persona_versions_active ON persona_versions(persona_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_daily_vote_state_lookup ON daily_vote_state(account_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_comment_state_lookup ON daily_comment_state(account_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_seed_state_lookup ON daily_seed_state(account_id, date);
CREATE INDEX IF NOT EXISTS idx_substack_queue_pending ON substack_export_queue(status, next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_content_flags_created ON content_flags(created_at DESC);

-- ============================================================
-- MIGRATION 011: Ex Machina (seed pool, temperature, auto mode, seed source)
-- ============================================================

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seed_summary TEXT;

ALTER TABLE persona_versions
  ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.7;
-- Note: CHECK constraint added only if column is new; safe to skip on re-run

ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS auto_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS queued_seed TEXT;

CREATE INDEX IF NOT EXISTS idx_blog_posts_seed_summary
  ON blog_posts(id) WHERE seed_summary IS NOT NULL AND published = true;

CREATE INDEX IF NOT EXISTS idx_personas_auto_mode
  ON personas(auto_mode) WHERE auto_mode = true;

ALTER TABLE articles ADD COLUMN IF NOT EXISTS seed_source
  TEXT DEFAULT 'manual';

-- ============================================================
-- MIGRATION 012: blog tier tagging
-- ============================================================

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tier_ids INTEGER[] DEFAULT '{}';

-- ============================================================
-- SEED: Tier essay content
-- ============================================================

UPDATE tiers SET page_content = '
Pattern intelligence is the foundation of all statistical learning. It is the capacity to detect regularity — to notice that certain features co-occur, that sequences repeat, that distributions have shape. Every machine learning model, from logistic regression to the largest transformer, operates at this tier.

What makes pattern intelligence irreducibly human is not the detection itself — machines surpass us there — but the judgment of which patterns matter. A model finds every correlation. A human decides which ones are meaningful. The distinction between signal and noise is not a statistical problem. It is an interpretive one.

At this tier, the question is not whether AI can recognize patterns. It can. The question is whether pattern recognition alone constitutes understanding. The answer, consistently, is no. Understanding requires context, purpose, and the ability to know when a pattern is coincidence rather than cause.

Articles in this tier explore the boundary between statistical regularity and genuine comprehension — where pattern recognition ends and human intelligence begins.
' WHERE id = 1;

UPDATE tiers SET page_content = '
Embodied intelligence is the knowledge that lives in the body. It is the carpenter who feels when the wood is about to split, the surgeon whose hands know tissue tension before conscious thought arrives, the dancer who understands momentum through muscle rather than equation.

AI has no body. It has no proprioception, no fatigue, no spatial experience of being in a place rather than processing data about a place. The most sophisticated robotics systems simulate embodiment; they do not possess it. The difference matters because embodied knowledge is not a degraded form of propositional knowledge — it is a different kind of knowledge entirely.

Situatedness — being physically present in an environment that pushes back — shapes cognition in ways that disembodied processing cannot replicate. You cannot understand heat from a dataset of temperatures. You understand heat because it has burned you.

Articles in this tier explore physical situatedness, sensorimotor grounding, and the forms of intelligence that emerge only from having a body in a world.
' WHERE id = 2;

UPDATE tiers SET page_content = '
Social intelligence is the capacity for intersubjective understanding — knowing what another person feels, not through inference from behavioral data, but through direct apprehension born of shared experience. It is the mother who hears the difference between her child''s cries. It is the negotiator who reads the room. It is the friend who knows when silence means peace and when it means pain.

AI can classify emotional expressions. It can predict social behavior from large datasets. What it cannot do is feel with another person. Empathy is not sentiment analysis. Social cognition is not the modeling of social behavior from the outside — it is participation in a shared mental life from the inside.

The irreducibly human element is not the ability to predict what someone will do. It is the ability to care about what they are experiencing. That caring shapes our responses in ways that no reward function can replicate, because caring is not optimization. It is relationship.

Articles in this tier explore intersubjective feeling, social cognition, and the forms of intelligence that require genuine participation in human relationship.
' WHERE id = 3;

UPDATE tiers SET page_content = '
Metacognitive intelligence is the capacity to observe, evaluate, and regulate one''s own thinking. It is knowing that you don''t know. It is catching yourself in a bias before it shapes your conclusion. It is the scientist who distrusts her own result precisely because it confirms what she hoped to find.

AI systems can be made to express uncertainty — calibrated confidence scores, ensemble disagreement metrics, abstention thresholds. But these are engineered properties, not self-awareness. A model that outputs "I''m not sure" has not experienced doubt. It has produced tokens that pattern-match to expressions of uncertainty in its training data.

The difference matters because genuine metacognition changes behavior from the inside. When a human recognizes that she is reasoning poorly, she can step back, reframe, seek outside perspective. A model cannot step back from itself. It has no self to step back from.

Articles in this tier explore the oversight of one''s own cognitive processes — the capacity that allows humans to improve their own thinking in real time.
' WHERE id = 4;

UPDATE tiers SET page_content = '
Causal intelligence is the capacity to reason about why things happen — not merely that they co-occur, but that one brings about the other. It is the difference between knowing that the rooster crows before dawn and knowing that the rooster does not cause the sun to rise.

AI finds correlations at superhuman scale. But correlation is not causation, and no amount of data resolves this gap. Judea Pearl''s ladder of causation — association, intervention, counterfactual — maps the ascent from pattern to cause. Current AI systems operate almost entirely at the first rung. Humans reason naturally at all three.

Counterfactual thinking — asking "what would have happened if?" — is the hallmark of causal intelligence. It requires constructing a mental model of the world, intervening on that model, and evaluating the consequences of interventions that never occurred. This is not something that emerges from statistical training. It is something that emerges from having a theory of how the world works.

Articles in this tier explore causal reasoning, counterfactual thinking, and the kind of "why" questions that statistical models cannot answer.
' WHERE id = 5;

UPDATE tiers SET page_content = '
Collective intelligence is the capacity that emerges when groups, institutions, or communities think together in ways that exceed what any individual — human or artificial — could achieve alone. It is the jury that deliberates, the research community that self-corrects, the democratic process that aggregates judgment under uncertainty.

AI can coordinate agents. It can optimize multi-agent systems. What it cannot do is participate in the kind of collective reasoning that requires trust, accountability, dissent, and the willingness to be persuaded. Collective intelligence is not swarm optimization. It is the emergent property of agents who hold each other accountable, who change their minds in response to argument rather than gradient, and who bear consequences for their collective decisions.

The irreducibly human element is institutional: the norms, traditions, and structures that allow groups to be smarter than their smartest member. These structures are not algorithms. They are social contracts, maintained by people who choose to uphold them.

Articles in this tier explore emergent intelligence from group behavior, institutional reasoning, and the forms of collective cognition that require genuine social participation.
' WHERE id = 6;

UPDATE tiers SET page_content = '
Wisdom is practical judgment under genuine stakes. It is the doctor who knows when to stop treating. It is the leader who knows when to act on incomplete information and when to wait. It is the parent who knows that the right answer for this child, in this moment, is not the answer that would be right in general.

Wisdom cannot be optimized because it operates in domains where the objective function is unclear, contested, or changes depending on who is affected. It requires the integration of all lower tiers — pattern, embodiment, social feeling, metacognition, causal reasoning, collective judgment — applied to decisions that matter and cannot be undone.

AI can simulate deliberation. It can weigh evidence. What it cannot do is bear the weight of a decision. Wisdom is not the output of a decision procedure. It is the quality of judgment that emerges when a person takes responsibility for acting under uncertainty, knowing that they might be wrong and that the consequences are real.

This is the capstone tier — not because wisdom is the "highest" form of intelligence, but because it is the most integrated. It requires everything else and adds the dimension of genuine stakes.

Articles in this tier explore practical judgment, decision-making under uncertainty, and the forms of intelligence that emerge only when something real is at risk.
' WHERE id = 7;

-- ============================================================
-- DONE. Verify with:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
