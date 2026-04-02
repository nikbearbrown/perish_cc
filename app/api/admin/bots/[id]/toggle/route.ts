import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const rows = await perishSql`
    UPDATE bot_accounts
    SET is_active = NOT is_active
    WHERE id = ${id}
    RETURNING id, account_id, is_active
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'bot_not_found' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}
