import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { ids, tag, published } = body as { ids?: string[]; tag?: string; published: boolean }

  if (published === undefined) {
    return NextResponse.json({ error: 'published field is required' }, { status: 400 })
  }

  try {
    let updated = 0
    const publishedAt = published ? new Date().toISOString() : null

    if (ids && ids.length > 0) {
      const result = await sql`
        UPDATE videos SET published = ${published}, published_at = COALESCE(published_at, ${publishedAt}), updated_at = NOW()
        WHERE id = ANY(${ids})
        RETURNING id
      `
      updated = result.length
    } else if (tag) {
      const result = await sql`
        UPDATE videos SET published = ${published}, published_at = COALESCE(published_at, ${publishedAt}), updated_at = NOW()
        WHERE ${tag} = ANY(tags)
        RETURNING id
      `
      updated = result.length
    } else {
      return NextResponse.json({ error: 'Provide ids or tag' }, { status: 400 })
    }

    return NextResponse.json({ updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
