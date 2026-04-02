import { NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { isAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rows = await perishSql`
    SELECT
      ba.id,
      ba.account_id,
      ba.is_active,
      ba.tier_weights,
      ba.last_posted_at,
      ba.last_voted_at,
      ba.last_commented_at,
      a.email,
      a.display_name,
      p.name AS persona_name,
      p.id AS persona_id
    FROM bot_accounts ba
    JOIN accounts a ON a.id = ba.account_id
    LEFT JOIN personas p ON p.account_id = ba.account_id
    ORDER BY p.name ASC
  `

  return NextResponse.json(rows)
}
