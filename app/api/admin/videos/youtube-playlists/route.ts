import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { parseYouTubeInput, fetchChannelPlaylists } from '@/lib/youtube'

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { input } = body as { input: string }

  if (!input) {
    return NextResponse.json({ error: 'Channel URL or handle is required' }, { status: 400 })
  }

  try {
    const parsed = parseYouTubeInput(input)

    let channelId: string
    if (parsed.type === 'playlist') {
      return NextResponse.json({ error: 'Provide a channel URL or handle, not a playlist' }, { status: 400 })
    } else if (parsed.type === 'handle') {
      const key = process.env.YOUTUBE_API_KEY
      if (!key) throw new Error('YOUTUBE_API_KEY is not set')
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(parsed.value)}&key=${key}`)
      const data = await res.json()
      if (!data.items?.length) throw new Error(`No channel found for @${parsed.value}`)
      channelId = data.items[0].id
    } else {
      channelId = parsed.value
    }

    const playlists = await fetchChannelPlaylists(channelId)
    return NextResponse.json({ channelId, playlists })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch playlists'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
