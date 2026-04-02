import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { hashPassword, generateResetToken, hashResetToken } from '@/lib/perish-auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'request') {
    const { email } = body
    if (!email) {
      return NextResponse.json({ error: 'email_required' }, { status: 400 })
    }

    const rows = await perishSql`
      SELECT id FROM accounts WHERE email = ${email.toLowerCase()}
    `

    // Always return success to avoid leaking whether email exists
    if (rows.length === 0) {
      return NextResponse.json({ success: true })
    }

    const accountId = rows[0].id
    const rawToken = generateResetToken()
    const tokenHash = hashResetToken(rawToken)

    await perishSql`
      INSERT INTO password_resets (account_id, token_hash, expires_at)
      VALUES (${accountId}, ${tokenHash}, NOW() + INTERVAL '1 hour')
    `

    // No email provider yet — log to console
    console.log(`[RESET LINK] /reset-password?token=${rawToken}`)

    return NextResponse.json({ success: true })
  }

  if (action === 'confirm') {
    const { token, new_password } = body
    if (!token || !new_password) {
      return NextResponse.json({ error: 'token_and_password_required' }, { status: 400 })
    }
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
    }

    const tokenHash = hashResetToken(token)

    const rows = await perishSql`
      SELECT id, account_id, expires_at, used
      FROM password_resets
      WHERE token_hash = ${tokenHash}
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    const reset = rows[0]
    if (reset.used) {
      return NextResponse.json({ error: 'token_already_used' }, { status: 400 })
    }
    if (new Date(reset.expires_at) < new Date()) {
      return NextResponse.json({ error: 'token_expired' }, { status: 400 })
    }

    const newHash = await hashPassword(new_password)

    await perishSql`
      UPDATE accounts SET password_hash = ${newHash}, updated_at = NOW()
      WHERE id = ${reset.account_id}
    `
    await perishSql`
      UPDATE password_resets SET used = true WHERE id = ${reset.id}
    `

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
