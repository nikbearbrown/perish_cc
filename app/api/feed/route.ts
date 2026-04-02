import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(params.get('limit') || '20', 10)))
  const tierFilter = params.get('tier_id')
  const sort = params.get('sort') || 'recent'
  const offset = (page - 1) * limit

  let articles
  let totalRows

  if (sort === 'week' || sort === 'month') {
    articles = await perishSql`
      SELECT
        b.article_id AS id,
        b.title,
        b.tier_id,
        t.name AS tier_name,
        t.slug AS tier_slug,
        b.published_at,
        b.persona_name,
        p.id AS persona_id,
        b.account_id,
        b.net_votes,
        a.is_backdated,
        a.hero_image_url,
        CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
      FROM ${sort === 'week' ? perishSql`best_of_week(${limit})` : perishSql`best_of_month(${limit})`} b
      JOIN tiers t ON t.id = b.tier_id
      JOIN personas p ON p.name = b.persona_name AND p.account_id = b.account_id
      JOIN articles a ON a.id = b.article_id
      LEFT JOIN bot_accounts ba ON ba.account_id = b.account_id
    `

    const countQuery = sort === 'week'
      ? perishSql`SELECT COUNT(*)::int AS total FROM best_of_week(1000)`
      : perishSql`SELECT COUNT(*)::int AS total FROM best_of_month(1000)`
    totalRows = await countQuery
  } else if (tierFilter) {
    const tierId = parseInt(tierFilter, 10)
    articles = await perishSql`
      SELECT
        a.id,
        a.title,
        a.tier_id,
        t.name AS tier_name,
        t.slug AS tier_slug,
        a.published_at,
        p.name AS persona_name,
        p.id AS persona_id,
        a.account_id,
        a.is_backdated,
        a.hero_image_url,
        COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes,
        CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
      FROM articles a
      JOIN tiers t ON t.id = a.tier_id
      JOIN personas p ON p.id = a.persona_id
      LEFT JOIN votes v ON v.article_id = a.id
      LEFT JOIN bot_accounts ba ON ba.account_id = a.account_id
      WHERE a.tier_id = ${tierId}
      GROUP BY a.id, a.title, a.tier_id, t.name, t.slug, a.published_at,
               p.name, p.id, a.account_id, a.is_backdated, a.hero_image_url, ba.id
      ORDER BY a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    totalRows = await perishSql`
      SELECT COUNT(*)::int AS total FROM articles WHERE tier_id = ${tierId}
    `
  } else {
    articles = await perishSql`
      SELECT
        a.id,
        a.title,
        a.tier_id,
        t.name AS tier_name,
        t.slug AS tier_slug,
        a.published_at,
        p.name AS persona_name,
        p.id AS persona_id,
        a.account_id,
        a.is_backdated,
        a.hero_image_url,
        COALESCE(SUM(CASE v.direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes,
        CASE WHEN ba.id IS NOT NULL THEN true ELSE false END AS is_bot
      FROM articles a
      JOIN tiers t ON t.id = a.tier_id
      JOIN personas p ON p.id = a.persona_id
      LEFT JOIN votes v ON v.article_id = a.id
      LEFT JOIN bot_accounts ba ON ba.account_id = a.account_id
      GROUP BY a.id, a.title, a.tier_id, t.name, t.slug, a.published_at,
               p.name, p.id, a.account_id, a.is_backdated, a.hero_image_url, ba.id
      ORDER BY a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    totalRows = await perishSql`
      SELECT COUNT(*)::int AS total FROM articles
    `
  }

  const total = totalRows[0]?.total ?? 0

  return NextResponse.json({
    articles,
    total,
    page,
    has_more: offset + articles.length < total,
  })
}
