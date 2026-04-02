import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'
import { fetchYouTubeVideos } from '@/lib/youtube'

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { input, tags, autoTag } = body as {
    input: string
    tags?: string[]
    autoTag?: string // optional playlist/channel name to add as tag
  }

  if (!input) {
    return NextResponse.json({ error: 'YouTube channel or playlist URL is required' }, { status: 400 })
  }

  try {
    const { videos, source } = await fetchYouTubeVideos(input)

    if (videos.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, total: 0, source })
    }

    // Get existing youtube_ids to skip duplicates
    const existing = await sql`SELECT youtube_id FROM videos`
    const existingIds = new Set(existing.map((r) => r.youtube_id as string))

    const baseTags = Array.isArray(tags) ? tags.filter(Boolean) : []
    if (autoTag) baseTags.push(autoTag)

    let imported = 0
    let skipped = 0

    for (const video of videos) {
      if (existingIds.has(video.videoId)) {
        skipped++
        continue
      }

      await sql`
        INSERT INTO videos (title, description, youtube_id, tags, pinned, published, published_at)
        VALUES (
          ${video.title},
          ${video.description || null},
          ${video.videoId},
          ${baseTags},
          false,
          false,
          null
        )
      `
      imported++
    }

    return NextResponse.json({ imported, skipped, total: videos.length, source })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
