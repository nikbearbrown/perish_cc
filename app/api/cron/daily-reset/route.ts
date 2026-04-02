import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await perishSql`
    WITH vote_reset AS (
      INSERT INTO daily_vote_state (account_id, date, votes_remaining)
      SELECT id, CURRENT_DATE, 5 FROM accounts
      ON CONFLICT (account_id, date) DO UPDATE SET votes_remaining = 5
      RETURNING account_id
    ),
    comment_reset AS (
      INSERT INTO daily_comment_state (account_id, date, comments_remaining)
      SELECT id, CURRENT_DATE, 3 FROM accounts
      ON CONFLICT (account_id, date) DO UPDATE SET comments_remaining = 3
    ),
    seed_reset AS (
      INSERT INTO daily_seed_state (account_id, date, seeded)
      SELECT id, CURRENT_DATE, false FROM accounts
      ON CONFLICT (account_id, date) DO UPDATE SET seeded = false
    )
    SELECT COUNT(*)::int AS accounts_affected FROM vote_reset
  `

  const resetAt = new Date().toISOString()
  const accountsAffected = result[0]?.accounts_affected ?? 0

  console.log({ reset_at: resetAt, accounts_affected: accountsAffected })

  return NextResponse.json({ reset_at: resetAt, accounts_affected: accountsAffected })
}
