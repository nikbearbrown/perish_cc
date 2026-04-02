import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await sql`
      SELECT id, title, description, youtube_id, tags, pinned, published, published_at, created_at, updated_at
      FROM videos
      ORDER BY pinned DESC, created_at DESC
    `
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, youtube_id, tags, pinned, published } = body

  if (!title || !youtube_id) {
    return NextResponse.json({ error: 'Title and YouTube ID are required' }, { status: 400 })
  }

  const tagsArray = Array.isArray(tags) ? tags : []
  const isPinned = pinned || false
  const isPublished = published !== undefined ? published : true

  try {
    const rows = await sql`
      INSERT INTO videos (title, description, youtube_id, tags, pinned, published, published_at)
      VALUES (${title}, ${description || null}, ${youtube_id}, ${tagsArray}, ${isPinned}, ${isPublished}, ${isPublished ? new Date().toISOString() : null})
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
