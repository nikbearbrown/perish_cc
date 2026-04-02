import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSessionAccount } from '@/lib/perish-auth'

export async function GET(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.redirect(new URL('/login?redirect=/dashboard/settings', req.url))
  }

  const clientId = process.env.SUBSTACK_CLIENT_ID
  const oauthUrl = process.env.SUBSTACK_OAUTH_URL
  if (!clientId || !oauthUrl) {
    return NextResponse.json({ error: 'substack_not_configured' }, { status: 500 })
  }

  const state = crypto.randomBytes(32).toString('hex')
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/substack/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  })

  // Sign the state for CSRF protection
  const secret = process.env.PERISH_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
  const stateSig = crypto.createHmac('sha256', secret).update(state).digest('hex')

  const response = NextResponse.redirect(`${oauthUrl}?${params}`)
  response.cookies.set('substack_oauth_state', `${state}.${stateSig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  })

  return response
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { perishSql } = await import('@/lib/db-perish')

  await perishSql`
    DELETE FROM substack_connections WHERE account_id = ${session.accountId}
  `

  return NextResponse.json({ success: true })
}
