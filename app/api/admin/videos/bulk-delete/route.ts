import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { ids, tag } = body as { ids?: string[]; tag?: string }

  try {
    let deleted = 0

    if (ids && ids.length > 0) {
      // Delete specific videos by ID
      const result = await sql`DELETE FROM videos WHERE id = ANY(${ids}) RETURNING id`
      deleted = result.length
    } else if (tag) {
      // Delete all videos with a specific tag
      const result = await sql`DELETE FROM videos WHERE ${tag} = ANY(tags) RETURNING id`
      deleted = result.length
    } else {
      return NextResponse.json({ error: 'Provide ids or tag to delete' }, { status: 400 })
    }

    return NextResponse.json({ deleted })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
