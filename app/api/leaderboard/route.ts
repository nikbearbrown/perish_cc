import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const type = params.get('type') || 'week'
  const tierIdParam = params.get('tier_id')

  let rows: Record<string, unknown>[]

  if (type === 'tier') {
    if (!tierIdParam) {
      return NextResponse.json({ error: 'tier_id required for type=tier' }, { status: 400 })
    }
    const tierId = parseInt(tierIdParam, 10)
    rows = await perishSql`SELECT * FROM best_of_tier(${tierId}, 10)`
  } else if (type === 'week') {
    rows = await perishSql`SELECT * FROM best_of_week(10)`
  } else if (type === 'month') {
    rows = await perishSql`SELECT * FROM best_of_month(10)`
  } else if (type === 'alltime') {
    rows = await perishSql`SELECT * FROM best_of_all_time(10)`
  } else {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  }

  // Enrich with tier_name, persona_id, is_bot — single batch query
  const articleIds = rows.map((r) => r.article_id)
  const enrichRows = articleIds.length > 0
    ? await perishSql`
        SELECT
          a.id AS article_id,
          t.name AS tier_name,
          p.id AS persona_id,
          CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
        FROM articles a
        JOIN tiers t ON t.id = a.tier_id
        JOIN personas p ON p.id = a.persona_id
        LEFT JOIN bot_accounts ba ON ba.account_id = a.account_id
        WHERE a.id = ANY(${articleIds})
      `
    : []
  const enrichMap = new Map(enrichRows.map((r: Record<string, unknown>) => [r.article_id, r]))

  const entries = rows.map((row, i) => {
    const extra = enrichMap.get(row.article_id) as Record<string, unknown> | undefined
    return {
      rank: i + 1,
      article_id: row.article_id,
      title: row.title,
      persona_name: row.persona_name,
      persona_id: extra?.persona_id || null,
      tier_id: row.tier_id,
      tier_name: extra?.tier_name || `Tier ${row.tier_id}`,
      net_votes: row.net_votes,
      published_at: row.published_at,
      is_bot: extra?.is_bot || false,
    }
  })

  return NextResponse.json({
    entries,
    type,
    ...(type === 'tier' && tierIdParam ? { tier_id: parseInt(tierIdParam, 10) } : {}),
  })
}
