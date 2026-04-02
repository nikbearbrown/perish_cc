import { NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function GET() {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rows = await perishSql`
    SELECT id, name FROM personas
    WHERE account_id = ${session.accountId}
    ORDER BY created_at DESC
  `

  return NextResponse.json(rows)
}
