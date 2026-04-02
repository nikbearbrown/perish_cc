import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { hashPassword, createSessionToken } from '@/lib/perish-auth'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'too_many_registrations' }, { status: 429 })
  }

  const body = await req.json()
  const { email, password, display_name } = body

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const existing = await perishSql`SELECT id FROM accounts WHERE email = ${email.toLowerCase()}`
  if (existing.length > 0) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const rows = await perishSql`
    INSERT INTO accounts (email, password_hash, display_name)
    VALUES (${email.toLowerCase()}, ${passwordHash}, ${display_name || null})
    RETURNING id
  `
  const accountId = rows[0].id

  const token = createSessionToken(accountId)
  const response = NextResponse.json({ accountId }, { status: 201 })
  response.cookies.set('perish_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return response
}
