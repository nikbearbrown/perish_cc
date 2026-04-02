import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'
import { getGeneration, removeGeneration } from '@/lib/generation-cache'
import { queueExport } from '@/lib/substack'

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim() || ''

  // If first line is a markdown heading
  if (firstLine.startsWith('#')) {
    const title = firstLine.replace(/^#+\s*/, '').trim()
    if (title) return title
  }

  // If first line is short enough to be a title
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return firstLine
  }

  // Fallback: first 80 chars
  return text.slice(0, 80).replace(/\s\S*$/, '') || 'Untitled'
}

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { generation_id, tier_id, persona_id } = body

  if (!generation_id) {
    return NextResponse.json({ error: 'generation_id_required' }, { status: 400 })
  }

  const cached = getGeneration(generation_id, session.accountId)
  if (!cached) {
    return NextResponse.json(
      { error: 'generation_expired', message: 'Generation not found or expired. Please generate again.' },
      { status: 404 },
    )
  }

  const title = extractTitle(cached.generated_text)
  const useTier = tier_id || cached.tier_id
  const usePersona = persona_id || cached.persona_id

  const rows = await perishSql`
    INSERT INTO articles (account_id, persona_id, persona_version_id, title, body, tier_id)
    VALUES (
      ${session.accountId},
      ${usePersona},
      ${cached.persona_version_id},
      ${title},
      ${cached.generated_text},
      ${useTier}
    )
    RETURNING id
  `
  const articleId = rows[0].id

  // Mark seeded for today
  await perishSql`
    INSERT INTO daily_seed_state (account_id, date, seeded)
    VALUES (${session.accountId}, CURRENT_DATE, true)
    ON CONFLICT (account_id, date) DO UPDATE SET seeded = true
  `

  // Queue Substack export if connection exists, otherwise mark not_connected
  const connectionCheck = await perishSql`
    SELECT id FROM substack_connections WHERE account_id = ${session.accountId}
  `
  if (connectionCheck.length > 0) {
    await queueExport(articleId)
  } else {
    await perishSql`
      UPDATE articles SET substack_export_status = 'not_connected' WHERE id = ${articleId}
    `
  }

  // Clean up cache
  removeGeneration(generation_id)

  return NextResponse.json({ articleId }, { status: 201 })
}
