import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '5', 10)))
    const tag = searchParams.get('tag') || ''
    const offset = (page - 1) * limit

    // Always fetch pinned video(s)
    const pinned = await sql`
      SELECT id, title, description, youtube_id, tags, pinned, published_at
      FROM videos
      WHERE published = true AND pinned = true
      ORDER BY published_at DESC
    `

    // Fetch non-pinned videos with optional tag filter + pagination
    let videos
    let countResult
    if (tag) {
      videos = await sql`
        SELECT id, title, description, youtube_id, tags, pinned, published_at
        FROM videos
        WHERE published = true AND pinned = false AND ${tag} = ANY(tags)
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM videos
        WHERE published = true AND pinned = false AND ${tag} = ANY(tags)
      `
    } else {
      videos = await sql`
        SELECT id, title, description, youtube_id, tags, pinned, published_at
        FROM videos
        WHERE published = true AND pinned = false
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM videos
        WHERE published = true AND pinned = false
      `
    }

    const total = countResult[0]?.total || 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({ pinned, videos, page, totalPages, total })
  } catch (err) {
    console.error('[api/videos] Failed to fetch videos:', err)
    return NextResponse.json({ pinned: [], videos: [], page: 1, totalPages: 1, total: 0 })
  }
}
