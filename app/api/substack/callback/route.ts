import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function GET(req: NextRequest) {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?substack=error&reason=missing_params', req.url))
  }

  // Validate CSRF state
  const stateCookie = req.cookies.get('substack_oauth_state')?.value
  if (!stateCookie) {
    return NextResponse.redirect(new URL('/dashboard/settings?substack=error&reason=no_state', req.url))
  }

  const [storedState, storedSig] = stateCookie.split('.')
  const secret = process.env.PERISH_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
  const expectedSig = crypto.createHmac('sha256', secret).update(storedState).digest('hex')

  if (state !== storedState || storedSig !== expectedSig) {
    return NextResponse.redirect(new URL('/dashboard/settings?substack=error&reason=invalid_state', req.url))
  }

  // Exchange code for access token
  const tokenUrl = process.env.SUBSTACK_TOKEN_URL
  const clientId = process.env.SUBSTACK_CLIENT_ID
  const clientSecret = process.env.SUBSTACK_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/substack/callback`

  if (!tokenUrl || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dashboard/settings?substack=error&reason=not_configured', req.url))
  }

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      console.error('[substack/callback] Token exchange failed:', tokenRes.status)
      return NextResponse.redirect(new URL('/dashboard/settings?substack=error&reason=token_exchange', req.url))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.redirect(new URL('/dashboard/settings?substack=error&reason=no_token', req.url))
    }

    // Fetch publication info
    // Placeholder: real Substack API endpoint TBD — adapt when Substack documents their API
    let publicationId = tokenData.publication_id || 'unknown'
    let publicationName = tokenData.publication_name || 'My Substack'
    let substackUrl = tokenData.substack_url || ''

    // Try to fetch from Substack user/publications endpoint if available
    try {
      const pubRes = await fetch('https://substack.com/api/v1/user/publications', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      if (pubRes.ok) {
        const pubs = await pubRes.json()
        if (Array.isArray(pubs) && pubs.length > 0) {
          publicationId = pubs[0].id || publicationId
          publicationName = pubs[0].name || publicationName
          substackUrl = pubs[0].url || substackUrl
        }
      }
    } catch {
      // Use defaults from token response
    }

    // Upsert connection
    await perishSql`
      INSERT INTO substack_connections (account_id, access_token, publication_id, publication_name, substack_url)
      VALUES (${session.accountId}, ${accessToken}, ${publicationId}, ${publicationName}, ${substackUrl})
      ON CONFLICT (account_id) DO UPDATE SET
        access_token = ${accessToken},
        publication_id = ${publicationId},
        publication_name = ${publicationName},
        substack_url = ${substackUrl},
        connected_at = NOW()
    `

    const response = NextResponse.redirect(new URL('/dashboard/settings?substack=connected', req.url))
    response.cookies.delete('substack_oauth_state')
    return response
  } catch (err) {
    console.error('[substack/callback] Error:', err)
    return NextResponse.redirect(new URL('/dashboard/settings?substack=error&reason=unknown', req.url))
  }
}
