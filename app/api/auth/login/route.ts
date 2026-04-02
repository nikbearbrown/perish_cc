import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { verifyPassword, createSessionToken } from '@/lib/perish-auth'

const failureMap = new Map<string, { count: number; resetAt: number }>()

function checkFailureLimit(ip: string): boolean {
  const now = Date.now()
  const entry = failureMap.get(ip)
  if (!entry || now > entry.resetAt) {
    return true
  }
  return entry.count < 5
}

function recordFailure(ip: string): void {
  const now = Date.now()
  const entry = failureMap.get(ip)
  if (!entry || now > entry.resetAt) {
    failureMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    entry.count++
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkFailureLimit(ip)) {
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 403 })
  }

  const body = await req.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const rows = await perishSql`
    SELECT id, password_hash FROM accounts WHERE email = ${email.toLowerCase()}
  `

  if (rows.length === 0) {
    recordFailure(ip)
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const account = rows[0]
  const valid = await verifyPassword(password, account.password_hash)
  if (!valid) {
    recordFailure(ip)
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = createSessionToken(account.id)
  const response = NextResponse.json({ accountId: account.id })
  response.cookies.set('perish_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return response
}
