import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const tierRows = await perishSql`
    SELECT id, name, slug, description, page_content
    FROM tiers WHERE slug = ${slug}
  `

  if (tierRows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const tier = tierRows[0]

  const articles = await perishSql`
    SELECT
      a.id, a.title, a.tier_id,
      t.name AS tier_name, t.slug AS tier_slug,
      a.published_at, a.account_id, a.is_backdated, a.hero_image_url,
      p.name AS persona_name, p.id AS persona_id,
      COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes,
      CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
    FROM articles a
    JOIN tiers t ON t.id = a.tier_id
    JOIN personas p ON p.id = a.persona_id
    LEFT JOIN votes v ON v.article_id = a.id
    LEFT JOIN bot_accounts ba ON ba.account_id = a.account_id
    WHERE a.tier_id = ${tier.id}
    GROUP BY a.id, a.title, a.tier_id, t.name, t.slug,
             a.published_at, a.account_id, a.is_backdated, a.hero_image_url,
             p.name, p.id, ba.id
    ORDER BY a.published_at DESC
    LIMIT 10
  `

  return NextResponse.json({
    ...tier,
    recent_articles: articles,
  })
}
