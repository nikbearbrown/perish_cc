-- migration-012: Add tier_ids array column to blog_posts
-- Safe to re-run (idempotent).

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS tier_ids INTEGER[] DEFAULT '{}';
