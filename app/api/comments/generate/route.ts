import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { perishSql, getCommentsRemaining } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'
import { generateContent, LLMException } from '@/lib/llm'
import { storeGeneration } from '@/lib/generation-cache'

// DESIGN NOTE (GDD Mechanic 4): The comment slot is consumed on generate,
// not on post. If the user cancels after seeing the generated comment, the
// slot is spent. This is intentional. Do not add logic to refund on cancel.

export async function POST(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { article_id, input_text, persona_id } = body

  if (!article_id || !input_text || !persona_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (typeof input_text !== 'string' || !input_text.trim()) {
    return NextResponse.json({ error: 'input_text_required' }, { status: 400 })
  }

  // Check comment budget
  const remaining = await getCommentsRemaining(session.accountId)
  if (remaining <= 0) {
    return NextResponse.json({ error: 'no_comments_remaining' }, { status: 429 })
  }

  // Get article title for seed context
  const articleRows = await perishSql`
    SELECT title FROM articles WHERE id = ${article_id}
  `
  if (articleRows.length === 0) {
    return NextResponse.json({ error: 'article_not_found' }, { status: 404 })
  }

  // Get persona active version
  const versionRows = await perishSql`
    SELECT pv.id, pv.prompt_text
    FROM persona_versions pv
    JOIN personas p ON p.id = pv.persona_id
    WHERE pv.persona_id = ${persona_id} AND pv.is_active = true AND p.account_id = ${session.accountId}
  `
  if (versionRows.length === 0) {
    return NextResponse.json({ error: 'persona_not_found' }, { status: 404 })
  }

  const promptText = versionRows[0].prompt_text
  const seed = articleRows[0].title + '\n' + input_text.trim()

  // Decrement comment budget BEFORE generation (slot consumed on generate, not post)
  await perishSql`
    INSERT INTO daily_comment_state (account_id, date, comments_remaining)
    VALUES (${session.accountId}, CURRENT_DATE, 2)
    ON CONFLICT (account_id, date) DO UPDATE SET comments_remaining = daily_comment_state.comments_remaining - 1
  `

  try {
    const result = await generateContent({
      persona_prompt: promptText,
      seed,
      mode: 'comment',
      account_id: session.accountId,
    })

    const generationId = crypto.randomUUID()

    storeGeneration(generationId, {
      generated_text: result.generated_text,
      persona_version_id: versionRows[0].id,
      persona_id,
      account_id: session.accountId,
      seed_text: seed,
      tier_id: 0,
    })

    return NextResponse.json({
      generated_comment: result.generated_text,
      generation_id: generationId,
    })
  } catch (err) {
    if (err instanceof LLMException) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
