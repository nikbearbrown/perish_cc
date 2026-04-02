import { NextRequest, NextResponse } from 'next/server'

// --- Admin session validation (ADMIN_PASSWORD-based, single shared token) ---

async function isValidAdminSession(cookieValue: string, secret: string): Promise<boolean> {
  if (!secret || !cookieValue) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('admin_session'))
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (cookieValue.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < cookieValue.length; i++) {
    mismatch |= cookieValue.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

// --- Perish user session validation (per-account HMAC-signed token) ---

async function isValidPerishSession(cookieValue: string, secret: string): Promise<boolean> {
  if (!secret || !cookieValue) return false

  const dotIndex = cookieValue.indexOf('.')
  if (dotIndex === -1) return false

  const payloadB64 = cookieValue.slice(0, dotIndex)
  const sig = cookieValue.slice(dotIndex + 1)

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expectedSigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))

  // base64url encode the expected signature
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  if (sig.length !== expectedSig.length) return false
  let mismatch = 0
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
  }
  if (mismatch !== 0) return false

  // Check expiry
  try {
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.accountId || !payload.exp) return false
    if (Date.now() > payload.exp) return false
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- Admin dashboard protection ---
  if (pathname.startsWith('/admin/dashboard')) {
    const session = request.cookies.get('admin_session')
    const secret = process.env.ADMIN_PASSWORD

    if (!session?.value || !secret) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const valid = await isValidAdminSession(session.value, secret)
    if (!valid) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('admin_session')
      return response
    }

    return NextResponse.next()
  }

  // --- User dashboard protection ---
  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get('perish_session')
    const secret = process.env.PERISH_SESSION_SECRET || process.env.ADMIN_PASSWORD

    if (!session?.value || !secret) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const valid = await isValidPerishSession(session.value, secret)
    if (!valid) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('perish_session')
      return response
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/dashboard/:path*'],
}
