import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Persona + bot check + active version
  const rows = await perishSql`
    SELECT
      p.id, p.name, p.description, p.account_id,
      p.byline_enabled, p.byline_text, p.byline_link, p.created_at,
      p.auto_mode,
      pv.version_number AS current_version,
      pv.prompt_text AS active_prompt,
      pv.temperature,
      CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
    FROM personas p
    JOIN persona_versions pv ON pv.persona_id = p.id AND pv.is_active = true
    LEFT JOIN bot_accounts ba ON ba.account_id = p.account_id
    WHERE p.id = ${id}
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const row = rows[0]
  const isBot = row.is_bot

  // Tier distribution
  const tierCounts = await perishSql`
    SELECT tier_id::text, COUNT(*)::int AS count
    FROM articles
    WHERE persona_id = ${id}
    GROUP BY tier_id
    ORDER BY tier_id
  `
  const tierDistribution: Record<string, number> = {}
  for (const tc of tierCounts) {
    tierDistribution[tc.tier_id] = tc.count
  }

  // Recent articles
  const recentArticles = await perishSql`
    SELECT
      a.id, a.title, a.tier_id,
      t.name AS tier_name, t.slug AS tier_slug,
      a.published_at, a.account_id, a.is_backdated,
      p2.name AS persona_name, p2.id AS persona_id,
      COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes,
      CASE WHEN ba2.id IS NOT NULL THEN true ELSE false END AS is_bot
    FROM articles a
    JOIN tiers t ON t.id = a.tier_id
    JOIN personas p2 ON p2.id = a.persona_id
    LEFT JOIN votes v ON v.article_id = a.id
    LEFT JOIN bot_accounts ba2 ON ba2.account_id = a.account_id
    WHERE a.persona_id = ${id}
    GROUP BY a.id, a.title, a.tier_id, t.name, t.slug,
             a.published_at, a.account_id, a.is_backdated,
             p2.name, p2.id, ba2.id
    ORDER BY a.published_at DESC
    LIMIT 20
  `

  // Total votes received
  const voteTotal = await perishSql`
    SELECT COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS total
    FROM votes v
    JOIN articles a ON a.id = v.article_id
    WHERE a.persona_id = ${id}
  `

  return NextResponse.json({
    persona: {
      id: row.id,
      name: row.name,
      description: row.description,
      account_id: row.account_id,
      byline_enabled: row.byline_enabled,
      byline_text: row.byline_text,
      byline_link: row.byline_link,
      created_at: row.created_at,
      auto_mode: row.auto_mode,
    },
    is_bot: isBot,
    // CRITICAL: only expose prompt for bot personas — never for humans
    active_prompt: isBot ? row.active_prompt : null,
    temperature: row.temperature,
    tier_distribution: tierDistribution,
    recent_articles: recentArticles,
    total_votes_received: voteTotal[0]?.total ?? 0,
    current_version: row.current_version,
  })
}
