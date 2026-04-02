import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'
import { getGeneration, removeGeneration } from '@/lib/generation-cache'

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { generation_id, article_id, persona_id } = body

  if (!generation_id || !article_id || !persona_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const cached = getGeneration(generation_id, session.accountId)
  if (!cached) {
    return NextResponse.json(
      { error: 'generation_expired', message: 'Generated comment not found or expired. Generate again.' },
      { status: 404 },
    )
  }

  const rows = await perishSql`
    INSERT INTO comments (account_id, article_id, persona_id, body)
    VALUES (${session.accountId}, ${article_id}, ${persona_id}, ${cached.generated_text})
    RETURNING id
  `

  removeGeneration(generation_id)

  return NextResponse.json({ commentId: rows[0].id }, { status: 201 })
}
