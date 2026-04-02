import { NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { isAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rows = await perishSql`
    SELECT
      cf.id,
      cf.content_type,
      cf.content_id,
      cf.created_at,
      a.email AS reporter_email,
      CASE
        WHEN cf.content_type = 'article' THEN (SELECT title FROM articles WHERE id = cf.content_id)
        WHEN cf.content_type = 'comment' THEN (SELECT LEFT(body, 100) FROM comments WHERE id = cf.content_id)
      END AS preview
    FROM content_flags cf
    JOIN accounts a ON a.id = cf.reporter_account_id
    ORDER BY cf.created_at DESC
  `

  return NextResponse.json(rows)
}
