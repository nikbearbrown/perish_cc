import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { isAdmin } from '@/lib/admin-auth'
import { exportArticle, type SubstackExportPayload } from '@/lib/substack'

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { article_id } = body

  if (!article_id) {
    return NextResponse.json({ error: 'article_id_required' }, { status: 400 })
  }

  const rows = await perishSql`
    SELECT
      a.id AS article_id, a.title, a.body, a.account_id, a.tier_id,
      p.name AS persona_name, p.description AS persona_description,
      t.name AS tier_name,
      sc.id AS connection_id, sc.access_token, sc.publication_id,
      sc.publication_name, sc.substack_url
    FROM articles a
    JOIN personas p ON p.id = a.persona_id
    JOIN tiers t ON t.id = a.tier_id
    LEFT JOIN substack_connections sc ON sc.account_id = a.account_id
    WHERE a.id = ${article_id}
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'article_not_found' }, { status: 404 })
  }

  const row = rows[0]

  if (!row.connection_id) {
    return NextResponse.json({ error: 'no_substack_connection', message: 'Article author has no Substack connection.' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://perish.cc'
  const payload: SubstackExportPayload = {
    article_id: row.article_id,
    title: row.title,
    body: row.body,
    persona_name: row.persona_name,
    persona_description: row.persona_description,
    perish_article_url: `${siteUrl}/article/${row.article_id}`,
    tier_id: row.tier_id,
    tier_name: row.tier_name,
    connection: {
      id: row.connection_id,
      account_id: row.account_id,
      access_token: row.access_token,
      publication_id: row.publication_id,
      publication_name: row.publication_name,
      substack_url: row.substack_url,
    },
  }

  const result = await exportArticle(payload)

  return NextResponse.json(result)
}
