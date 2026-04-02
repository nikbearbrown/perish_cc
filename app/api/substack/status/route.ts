import { NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { getSessionAccount } from '@/lib/perish-auth'

export async function GET() {
  const session = await getSessionAccount()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rows = await perishSql`
    SELECT publication_name, substack_url, connected_at
    FROM substack_connections
    WHERE account_id = ${session.accountId}
  `

  if (rows.length === 0) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    publication_name: rows[0].publication_name,
    substack_url: rows[0].substack_url,
    connected_at: rows[0].connected_at,
  })
}
