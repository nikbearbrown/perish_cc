import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'
import { hasSeededToday } from '@/lib/db-perish'
import { generateContent, estimateTokens, LLMException } from '@/lib/llm'
import { storeGeneration } from '@/lib/generation-cache'

const LLM_MAX_CONTEXT = () => parseInt(process.env.LLM_MAX_CONTEXT || '100000', 10)

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { seed_text, tier_id, persona_id } = body

  if (!seed_text || typeof seed_text !== 'string' || !seed_text.trim()) {
    return NextResponse.json({ error: 'seed_text_required' }, { status: 400 })
  }
  if (!tier_id || typeof tier_id !== 'number' || tier_id < 1 || tier_id > 7) {
    return NextResponse.json({ error: 'invalid_tier' }, { status: 400 })
  }
  if (!persona_id) {
    return NextResponse.json({ error: 'persona_id_required' }, { status: 400 })
  }

  // Check daily limit
  const seeded = await hasSeededToday(session.accountId)
  if (seeded) {
    return NextResponse.json(
      { error: 'already_seeded', message: 'One article per day. Come back tomorrow.' },
      { status: 409 },
    )
  }

  // Ownership check
  const personaRows = await perishSql`
    SELECT id, account_id FROM personas WHERE id = ${persona_id}
  `
  if (personaRows.length === 0) {
    return NextResponse.json({ error: 'persona_not_found' }, { status: 404 })
  }
  if (personaRows[0].account_id !== session.accountId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
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

  // Token pre-check
  if (estimateTokens(promptText + seed_text) > LLM_MAX_CONTEXT()) {
    return NextResponse.json({ error: 'prompt_too_long' }, { status: 400 })
  }

  // Generate
  try {
    const result = await generateContent({
      persona_prompt: promptText,
      seed: seed_text,
      mode: 'article',
      account_id: session.accountId,
      tier_id,
    })

    const generationId = crypto.randomUUID()

    storeGeneration(generationId, {
      generated_text: result.generated_text,
      persona_version_id: personaVersionId,
      persona_id,
      account_id: session.accountId,
      seed_text,
      tier_id,
    })

    // Ensure daily_seed_state row exists (but don't mark seeded yet — that happens on publish)
    await perishSql`
      INSERT INTO daily_seed_state (account_id, date, seeded, regen_count)
      VALUES (${session.accountId}, CURRENT_DATE, false, 0)
      ON CONFLICT (account_id, date) DO NOTHING
    `

    return NextResponse.json({
      generated_text: result.generated_text,
      persona_version_id: personaVersionId,
      generation_id: generationId,
    })
  } catch (err) {
    if (err instanceof LLMException) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
