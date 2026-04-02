import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken } from '@/lib/perish-auth'
import { perishSql } from '@/lib/db-perish'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: personaId } = await params
  const token = request.cookies.get('perish_session')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = await validateSessionToken(token)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Verify ownership
  const personas = await perishSql`
    SELECT id, account_id, auto_mode FROM personas WHERE id = ${personaId}
  `
  if (personas.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (personas[0].account_id !== session.accountId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!personas[0].auto_mode) {
    return NextResponse.json(
      { error: 'not_auto_mode', message: 'Enable auto mode first.' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const seedText = body.seed_text?.trim()
  if (!seedText) {
    return NextResponse.json({ error: 'seed_text required' }, { status: 400 })
  }

  await perishSql`
    UPDATE personas SET queued_seed = ${seedText} WHERE id = ${personaId}
  `

  return NextResponse.json({ queued: true, seed_text: seedText })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: personaId } = await params
  const token = request.cookies.get('perish_session')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = await validateSessionToken(token)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const personas = await perishSql`
    SELECT id, account_id FROM personas WHERE id = ${personaId}
  `
  if (personas.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (personas[0].account_id !== session.accountId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  await perishSql`
    UPDATE personas SET queued_seed = NULL WHERE id = ${personaId}
  `

  return NextResponse.json({ cleared: true })
}
