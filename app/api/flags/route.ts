import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { content_type, content_id } = body

  if (!content_type || !content_id || !['article', 'comment'].includes(content_type)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const existing = await perishSql`
    SELECT id FROM content_flags
    WHERE reporter_account_id = ${session.accountId}
      AND content_type = ${content_type}
      AND content_id = ${content_id}
  `
  if (existing.length > 0) {
    return NextResponse.json({ error: 'already_flagged' }, { status: 409 })
  }

  await perishSql`
    INSERT INTO content_flags (reporter_account_id, content_type, content_id)
    VALUES (${session.accountId}, ${content_type}, ${content_id})
  `

  return NextResponse.json({ success: true }, { status: 201 })
}
