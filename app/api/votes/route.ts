import { NextRequest, NextResponse } from 'next/server'
import { perishSql, getVotesRemaining } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { article_id, direction } = body

  if (!article_id || !direction || !['up', 'down'].includes(direction)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // Check votes remaining
  const remaining = await getVotesRemaining(session.accountId)
  if (remaining <= 0) {
    return NextResponse.json({ error: 'no_votes_remaining', votes_remaining: 0 }, { status: 429 })
  }

  // Check self-vote
  const articleRows = await perishSql`
    SELECT account_id FROM articles WHERE id = ${article_id}
  `
  if (articleRows.length === 0) {
    return NextResponse.json({ error: 'article_not_found' }, { status: 404 })
  }
  if (articleRows[0].account_id === session.accountId) {
    return NextResponse.json({ error: 'self_vote' }, { status: 403 })
  }

  // Check already voted
  const existingVote = await perishSql`
    SELECT id FROM votes WHERE voter_account_id = ${session.accountId} AND article_id = ${article_id}
  `
  if (existingVote.length > 0) {
    return NextResponse.json({ error: 'already_voted' }, { status: 409 })
  }

  // Insert vote
  await perishSql`
    INSERT INTO votes (voter_account_id, article_id, direction)
    VALUES (${session.accountId}, ${article_id}, ${direction})
  `

  // Decrement daily votes
  await perishSql`
    INSERT INTO daily_vote_state (account_id, date, votes_remaining)
    VALUES (${session.accountId}, CURRENT_DATE, 4)
    ON CONFLICT (account_id, date) DO UPDATE SET votes_remaining = daily_vote_state.votes_remaining - 1
  `

  // Get updated net votes
  const netRows = await perishSql`
    SELECT COALESCE(SUM(CASE direction WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END), 0)::int AS net_votes
    FROM votes WHERE article_id = ${article_id}
  `

  const newRemaining = await getVotesRemaining(session.accountId)

  return NextResponse.json({
    net_votes: netRows[0]?.net_votes ?? 0,
    votes_remaining: newRemaining,
  })
}
