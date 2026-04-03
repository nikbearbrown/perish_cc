import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = 50

  try {
    const data = await sql`
      SELECT
        a.id,
        a.title,
        a.published_at,
        a.tier_id,
        a.is_backdated,
        a.seed_source,
        p.name AS persona_name,
        ba.account_id IS NOT NULL AS is_bot,
        COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes
      FROM articles a
      JOIN personas p ON p.id = a.persona_id
      LEFT JOIN bot_accounts ba ON ba.account_id = a.account_id
      LEFT JOIN votes v ON v.article_id = a.id
      GROUP BY a.id, a.title, a.published_at, a.tier_id, a.is_backdated, a.seed_source, p.name, ba.account_id
      ORDER BY a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
