import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { isAdmin } from '@/lib/admin-auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { page_content } = body

  if (page_content === undefined) {
    return NextResponse.json({ error: 'page_content_required' }, { status: 400 })
  }

  const rows = await perishSql`
    UPDATE tiers SET page_content = ${page_content} WHERE id = ${parseInt(id, 10)}
    RETURNING id, name, slug
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'tier_not_found' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}
