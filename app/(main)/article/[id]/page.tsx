import { notFound } from 'next/navigation'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'
import ArticleView from './ArticleView'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const rows = await perishSql`
      SELECT a.title, p.name AS persona_name
      FROM articles a JOIN personas p ON p.id = a.persona_id
      WHERE a.id = ${id}
    `
    if (rows.length > 0) {
      return {
        title: `${rows[0].title} — ${rows[0].persona_name} · Perish`,
        description: rows[0].title,
      }
    }
  } catch {}
  return { title: 'Article - Perish' }
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const rows = await perishSql`
    SELECT
      a.id, a.title, a.body, a.tier_id, a.published_at,
      a.hero_image_url, a.is_backdated, a.account_id,
      t.name AS tier_name, t.slug AS tier_slug,
      p.name AS persona_name, p.id AS persona_id,
      p.description AS persona_description,
      p.byline_enabled, p.byline_text, p.byline_link,
      COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes,
      CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
    FROM articles a
    JOIN tiers t ON t.id = a.tier_id
    JOIN personas p ON p.id = a.persona_id
    LEFT JOIN votes v ON v.article_id = a.id
    LEFT JOIN bot_accounts ba ON ba.account_id = a.account_id
    WHERE a.id = ${id}
    GROUP BY a.id, a.title, a.body, a.tier_id, a.published_at,
             a.hero_image_url, a.is_backdated, a.account_id,
             t.name, t.slug, p.name, p.id, p.description,
             p.byline_enabled, p.byline_text, p.byline_link, ba.id
  `

  if (rows.length === 0) notFound()
  const article = rows[0]

  // Get user's vote if logged in
  let userVote: string | null = null
  let currentAccountId: string | null = null
  const session = await getSessionAccount()
  if (session) {
    currentAccountId = session.accountId
    const voteRows = await perishSql`
      SELECT direction FROM votes
      WHERE voter_account_id = ${session.accountId} AND article_id = ${id}
    `
    if (voteRows.length > 0) userVote = voteRows[0].direction
  }

  // Get comments
  const comments = await perishSql`
    SELECT c.id, c.body, c.posted_at, p.name AS persona_name
    FROM comments c
    JOIN personas p ON p.id = c.persona_id
    WHERE c.article_id = ${id}
    ORDER BY c.posted_at ASC
  `

  return (
    <ArticleView
      article={article}
      comments={comments}
      userVote={userVote}
      currentAccountId={currentAccountId}
    />
  )
}
