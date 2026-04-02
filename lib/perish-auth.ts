import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'

const SESSION_SECRET = () => process.env.PERISH_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createSessionToken(accountId: string): string {
  const secret = SESSION_SECRET()
  if (!secret) throw new Error('Session secret not configured')
  const payload = JSON.stringify({ accountId, exp: Date.now() + SESSION_MAX_AGE * 1000 })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

export function validateSessionToken(token: string): { accountId: string } | null {
  const secret = SESSION_SECRET()
  if (!secret || !token) return null

  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) return null

  const payloadB64 = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)

  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')

  if (sig.length !== expectedSig.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    if (!payload.accountId || !payload.exp) return null
    if (Date.now() > payload.exp) return null
    return { accountId: payload.accountId }
  } catch {
    return null
  }
}

export async function getSessionAccount(): Promise<{ accountId: string } | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('perish_session')
  if (!session?.value) return null
  return validateSessionToken(session.value)
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
