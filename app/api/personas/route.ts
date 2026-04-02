import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, prompt_text, byline_enabled, byline_text, byline_link } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ error: 'description_required' }, { status: 400 })
  }
  if (!prompt_text || typeof prompt_text !== 'string' || !prompt_text.trim()) {
    return NextResponse.json({ error: 'prompt_text_required' }, { status: 400 })
  }

  const personaRows = await perishSql`
    INSERT INTO personas (account_id, name, description, byline_enabled, byline_text, byline_link)
    VALUES (
      ${session.accountId},
      ${name.trim()},
      ${description.trim()},
      ${byline_enabled || false},
      ${byline_text || null},
      ${byline_link || null}
    )
    RETURNING id
  `
  const personaId = personaRows[0].id

  await perishSql`
    INSERT INTO persona_versions (persona_id, prompt_text, version_number, is_active)
    VALUES (${personaId}, ${prompt_text.trim()}, 1, true)
  `

  return NextResponse.json({ personaId }, { status: 201 })
}
