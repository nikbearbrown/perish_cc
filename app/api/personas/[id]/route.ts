import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const rows = await perishSql`
    SELECT
      p.id, p.account_id, p.name, p.description,
      p.byline_enabled, p.byline_text, p.byline_link,
      pv.prompt_text, pv.version_number, pv.created_at AS version_created_at
    FROM personas p
    JOIN persona_versions pv ON pv.persona_id = p.id AND pv.is_active = true
    WHERE p.id = ${id} AND p.account_id = ${session.accountId}
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const persona = rows[0]

  const versions = await perishSql`
    SELECT version_number, created_at, is_active
    FROM persona_versions
    WHERE persona_id = ${id}
    ORDER BY version_number DESC
  `

  return NextResponse.json({ ...persona, versions })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const ownerCheck = await perishSql`
    SELECT id, account_id FROM personas WHERE id = ${id}
  `
  if (ownerCheck.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (ownerCheck[0].account_id !== session.accountId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { prompt_text, byline_enabled, byline_text, byline_link, name, description, auto_mode, temperature } = body

  if (!prompt_text || typeof prompt_text !== 'string' || !prompt_text.trim()) {
    return NextResponse.json({ error: 'prompt_text_required' }, { status: 400 })
  }

  const resolvedTemperature = typeof temperature === 'number' ? temperature : 0.7
  if (resolvedTemperature < 0.0 || resolvedTemperature > 1.0) {
    return NextResponse.json({ error: 'temperature_out_of_range', message: 'Temperature must be between 0.0 and 1.0.' }, { status: 400 })
  }

  // Deactivate all existing versions
  await perishSql`
    UPDATE persona_versions SET is_active = false WHERE persona_id = ${id}
  `

  // Get next version number
  const maxRow = await perishSql`
    SELECT COALESCE(MAX(version_number), 0)::int AS max_version
    FROM persona_versions WHERE persona_id = ${id}
  `
  const nextVersion = maxRow[0].max_version + 1

  await perishSql`
    INSERT INTO persona_versions (persona_id, prompt_text, version_number, is_active, temperature)
    VALUES (${id}, ${prompt_text.trim()}, ${nextVersion}, true, ${resolvedTemperature})
  `

  // Update metadata if provided (including auto_mode)
  if (name || description || byline_enabled !== undefined || auto_mode !== undefined) {
    await perishSql`
      UPDATE personas SET
        name = COALESCE(${name?.trim() || null}, name),
        description = COALESCE(${description?.trim() || null}, description),
        byline_enabled = COALESCE(${byline_enabled ?? null}, byline_enabled),
        byline_text = COALESCE(${byline_text ?? null}, byline_text),
        byline_link = COALESCE(${byline_link ?? null}, byline_link),
        auto_mode = COALESCE(${auto_mode ?? null}, auto_mode)
      WHERE id = ${id}
    `
  }

  return NextResponse.json({ versionNumber: nextVersion })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const ownerCheck = await perishSql`
    SELECT id, account_id FROM personas WHERE id = ${id}
  `
  if (ownerCheck.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (ownerCheck[0].account_id !== session.accountId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Check for existing articles
  const articleCheck = await perishSql`
    SELECT COUNT(*)::int AS count FROM articles WHERE persona_id = ${id}
  `
  if (articleCheck[0].count > 0) {
    return NextResponse.json(
      { error: 'cannot_delete', message: `This persona has ${articleCheck[0].count} published article(s). Delete or reassign them first.` },
      { status: 409 },
    )
  }

  await perishSql`DELETE FROM personas WHERE id = ${id}`

  return NextResponse.json({ success: true })
}
