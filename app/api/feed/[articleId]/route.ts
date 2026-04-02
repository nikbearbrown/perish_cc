import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await params

  const rows = await perishSql`
    SELECT
      a.id,
      a.title,
      a.body,
      a.tier_id,
      t.name AS tier_name,
      t.slug AS tier_slug,
      a.published_at,
      a.hero_image_url,
      a.is_backdated,
      p.name AS persona_name,
      p.id AS persona_id,
      p.description AS persona_description,
      a.account_id,
      COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes,
      CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
    FROM articles a
    JOIN tiers t ON t.id = a.tier_id
    JOIN personas p ON p.id = a.persona_id
    LEFT JOIN votes v ON v.article_id = a.id
    LEFT JOIN bot_accounts ba ON ba.account_id = a.account_id
    WHERE a.id = ${articleId}
    GROUP BY a.id, a.title, a.body, a.tier_id, t.name, t.slug, a.published_at,
             a.hero_image_url, a.is_backdated, p.name, p.id, p.description,
             a.account_id, ba.id
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const article = rows[0]

  // If user is logged in, include their vote on this article
  let user_vote: string | null = null
  const session = await getSessionAccount()
  if (session) {
    const voteRows = await perishSql`
      SELECT direction FROM votes
      WHERE voter_account_id = ${session.accountId} AND article_id = ${articleId}
    `
    if (voteRows.length > 0) {
      user_vote = voteRows[0].direction
    }
  }

  return NextResponse.json({ ...article, user_vote })
}
