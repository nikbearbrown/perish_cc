import { sql } from '@/lib/db'
import type { Metadata } from 'next'
import VideosBrowser from './VideosBrowser'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Perish Videos',
  description: 'Video tutorials, lectures, and educational content from Perish.',
}

export default async function VideosPage() {
  type Video = { id: string; title: string; description: string | null; youtube_id: string; tags: string[] | null; pinned: boolean; published_at: string | null }
  let pinned: Video[] = []
  let videos: Video[] = []
  let total = 0

  try {
    pinned = (await sql`
      SELECT id, title, description, youtube_id, tags, pinned, published_at
      FROM videos
      WHERE published = true AND pinned = true
      ORDER BY published_at DESC
    `) as Video[]
    videos = (await sql`
      SELECT id, title, description, youtube_id, tags, pinned, published_at
      FROM videos
      WHERE published = true AND pinned = false
      ORDER BY published_at DESC
      LIMIT 5
    `) as Video[]
    const countResult = await sql`
      SELECT COUNT(*)::int AS total FROM videos WHERE published = true AND pinned = false
    `
    total = countResult[0]?.total || 0
  } catch (err) {
    console.error('[videos/page] Failed to fetch videos:', err)
  }

  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tighter mb-4">Perish</h1>
        <p className="text-muted-foreground mb-10">
          Video tutorials, lectures, and educational content.
        </p>
        <VideosBrowser
          pinnedVideos={pinned}
          initialVideos={videos}
          initialTotal={total}
        />
      </div>
    </div>
  )
}
