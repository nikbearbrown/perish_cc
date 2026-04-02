import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'
import { generateContent, LLMException } from '@/lib/llm'
import { getGeneration, storeGeneration, removeGeneration } from '@/lib/generation-cache'

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { generation_id, seed_text, persona_id } = body

  if (!generation_id || !persona_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // Verify original generation belongs to this account
  const original = getGeneration(generation_id, session.accountId)
  if (!original) {
    return NextResponse.json({ error: 'generation_not_found' }, { status: 404 })
  }

  // Check regen_count
  const stateRows = await perishSql`
    SELECT regen_count FROM daily_seed_state
    WHERE account_id = ${session.accountId} AND date = CURRENT_DATE
  `
  const regenCount = stateRows.length > 0 ? (stateRows[0].regen_count ?? 0) : 0
  if (regenCount >= 1) {
    return NextResponse.json({ error: 'regeneration_used' }, { status: 409 })
  }

  // Get active version
  const versionRows = await perishSql`
    SELECT id, prompt_text FROM persona_versions
    WHERE persona_id = ${persona_id} AND is_active = true
  `
  if (versionRows.length === 0) {
    return NextResponse.json({ error: 'no_active_version' }, { status: 400 })
  }

  const personaVersionId = versionRows[0].id
  const promptText = versionRows[0].prompt_text
  const actualSeed = seed_text || original.seed_text

  try {
    const result = await generateContent({
      persona_prompt: promptText,
      seed: actualSeed,
      mode: 'article',
      account_id: session.accountId,
      tier_id: original.tier_id,
    })

    // Increment regen_count
    await perishSql`
      INSERT INTO daily_seed_state (account_id, date, seeded, regen_count)
      VALUES (${session.accountId}, CURRENT_DATE, false, 1)
      ON CONFLICT (account_id, date) DO UPDATE SET regen_count = daily_seed_state.regen_count + 1
    `

    // Remove old, store new
    removeGeneration(generation_id)
    const newGenerationId = crypto.randomUUID()
    storeGeneration(newGenerationId, {
      generated_text: result.generated_text,
      persona_version_id: personaVersionId,
      persona_id,
      account_id: session.accountId,
      seed_text: actualSeed,
      tier_id: original.tier_id,
    })

    return NextResponse.json({
      generated_text: result.generated_text,
      generation_id: newGenerationId,
    })
  } catch (err) {
    if (err instanceof LLMException) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
