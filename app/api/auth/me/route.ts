import { NextResponse } from 'next/server'
import { getSessionAccount } from '@/lib/perish-auth'
import { getVotesRemaining, getCommentsRemaining } from '@/lib/db-perish'

export async function GET() {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const votesRemaining = await getVotesRemaining(session.accountId)
  const commentsRemaining = await getCommentsRemaining(session.accountId)

  return NextResponse.json({
    accountId: session.accountId,
    votes_remaining: votesRemaining,
    comments_remaining: commentsRemaining,
  })
}
