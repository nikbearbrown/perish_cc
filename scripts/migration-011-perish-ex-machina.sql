-- migration-011: Ex Machina seed pool, persona temperature, and auto mode
-- Safe to re-run (idempotent).

-- Ex Machina seed pool
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seed_summary TEXT;

-- Persona mode and temperature
ALTER TABLE persona_versions
  ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.7
  CHECK (temperature BETWEEN 0.0 AND 1.0);

ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS auto_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS queued_seed TEXT;

-- Index for seed pool query
CREATE INDEX IF NOT EXISTS idx_blog_posts_seed_summary
  ON blog_posts(id) WHERE seed_summary IS NOT NULL AND published = true;

-- Index for auto mode pipeline
CREATE INDEX IF NOT EXISTS idx_personas_auto_mode
  ON personas(auto_mode) WHERE auto_mode = true;

-- Article seed source tracking
ALTER TABLE articles ADD COLUMN IF NOT EXISTS seed_source
  TEXT CHECK (seed_source IN ('manual', 'queued', 'ex_machina', 'tier_weight'))
  DEFAULT 'manual';
