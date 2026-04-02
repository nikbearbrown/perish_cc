import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { isAdmin } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/perish-auth'

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const botEmail = 'bot-placeholder@perish.cc'

  // Check if already exists
  const existing = await perishSql`SELECT id FROM accounts WHERE email = ${botEmail}`
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'already_exists', message: 'Placeholder bot account already exists', account_id: existing[0].id },
      { status: 409 },
    )
  }

  // Create account
  const passwordHash = await hashPassword('bot-placeholder-not-for-login')
  const accountRows = await perishSql`
    INSERT INTO accounts (email, password_hash, display_name)
    VALUES (${botEmail}, ${passwordHash}, 'Placeholder Bot')
    RETURNING id
  `
  const accountId = accountRows[0].id

  // Create persona
  const personaRows = await perishSql`
    INSERT INTO personas (account_id, name, description, byline_enabled)
    VALUES (
      ${accountId},
      'The Analyst',
      'A clear-eyed observer of intelligence in all its forms.',
      false
    )
    RETURNING id
  `
  const personaId = personaRows[0].id

  // Create persona version
  await perishSql`
    INSERT INTO persona_versions (persona_id, prompt_text, version_number, is_active)
    VALUES (
      ${personaId},
      'Write clearly and analytically about intelligence. Avoid jargon. Favor concrete examples over abstract claims. Keep paragraphs short. Never use bullet points or numbered lists — write in prose.',
      1,
      true
    )
  `

  // Create bot_accounts entry with balanced tier weights
  const balancedWeights = JSON.stringify({ '1': 0.14, '2': 0.14, '3': 0.14, '4': 0.14, '5': 0.14, '6': 0.14, '7': 0.16 })
  await perishSql`
    INSERT INTO bot_accounts (account_id, is_active, tier_weights)
    VALUES (${accountId}, true, ${balancedWeights}::jsonb)
  `

  return NextResponse.json({
    account_id: accountId,
    persona_id: personaId,
    email: botEmail,
    message: 'Placeholder bot created with balanced tier weights',
  }, { status: 201 })
}
