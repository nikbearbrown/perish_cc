-- Performance indexes for Perish critical endpoints
-- Feed, votes, leaderboard, persona profile

-- articles: feed ordering and tier filtering
CREATE INDEX IF NOT EXISTS idx_articles_published_at_desc ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tier_id ON articles(tier_id);
CREATE INDEX IF NOT EXISTS idx_articles_account_id ON articles(account_id);
CREATE INDEX IF NOT EXISTS idx_articles_persona_id ON articles(persona_id);

-- votes: aggregation by article, lookup by voter
CREATE INDEX IF NOT EXISTS idx_votes_article_id ON votes(article_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_account_id ON votes(voter_account_id);

-- comments: listing by article
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);

-- persona_versions: active version lookup
CREATE INDEX IF NOT EXISTS idx_persona_versions_active ON persona_versions(persona_id) WHERE is_active = true;

-- daily state: account+date lookups
CREATE INDEX IF NOT EXISTS idx_daily_vote_state_lookup ON daily_vote_state(account_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_comment_state_lookup ON daily_comment_state(account_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_seed_state_lookup ON daily_seed_state(account_id, date);

-- substack export queue: pending items
CREATE INDEX IF NOT EXISTS idx_substack_queue_pending ON substack_export_queue(status, next_retry_at) WHERE status = 'pending';

-- content flags: admin listing
CREATE INDEX IF NOT EXISTS idx_content_flags_created ON content_flags(created_at DESC);
