const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export interface YouTubeVideo {
  videoId: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY is not set')
  return key
}

export function parseYouTubeInput(input: string): { type: 'channel' | 'playlist' | 'handle'; value: string } {
  const trimmed = input.trim()

  const playlistMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/) || trimmed.match(/^(PL[a-zA-Z0-9_-]+)$/)
  if (playlistMatch) return { type: 'playlist', value: playlistMatch[1] }

  const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/)
  if (channelMatch) return { type: 'channel', value: channelMatch[1] }

  const handleMatch = trimmed.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/) || trimmed.match(/^@([a-zA-Z0-9_.-]+)$/)
  if (handleMatch) return { type: 'handle', value: handleMatch[1] }

  if (trimmed.startsWith('UC') && trimmed.length >= 20) return { type: 'channel', value: trimmed }

  throw new Error('Could not parse YouTube URL. Provide a channel URL, @handle, or playlist URL.')
}

async function resolveHandle(handle: string): Promise<string> {
  const key = getApiKey()
  const url = `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (!data.items?.length) throw new Error(`No channel found for @${handle}`)
  return data.items[0].id
}

async function getUploadsPlaylistId(channelId: string): Promise<string> {
  const key = getApiKey()
  const url = `${YOUTUBE_API_BASE}/channels?part=contentDetails&id=${channelId}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (!data.items?.length) throw new Error(`Channel not found: ${channelId}`)
  return data.items[0].contentDetails.relatedPlaylists.uploads
}

async function fetchPlaylistVideos(playlistId: string, maxResults = 500): Promise<YouTubeVideo[]> {
  const key = getApiKey()
  const videos: YouTubeVideo[] = []
  let pageToken: string | undefined

  while (videos.length < maxResults) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`)
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${res.statusText}`)
    const data = await res.json()

    for (const item of data.items || []) {
      const snippet = item.snippet
      if (snippet.title === 'Deleted video' || snippet.title === 'Private video') continue
      videos.push({
        videoId: snippet.resourceId.videoId,
        title: snippet.title,
        description: snippet.description || '',
        publishedAt: snippet.publishedAt,
        thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      })
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return videos
}

export async function fetchChannelPlaylists(channelId: string): Promise<{ id: string; title: string; videoCount: number }[]> {
  const key = getApiKey()
  const playlists: { id: string; title: string; videoCount: number }[] = []
  let pageToken: string | undefined

  while (true) {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      channelId,
      maxResults: '50',
      key,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${YOUTUBE_API_BASE}/playlists?${params}`)
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${res.statusText}`)
    const data = await res.json()

    for (const item of data.items || []) {
      playlists.push({
        id: item.id,
        title: item.snippet.title,
        videoCount: item.contentDetails.itemCount,
      })
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return playlists
}

export async function fetchYouTubeVideos(input: string): Promise<{ videos: YouTubeVideo[]; source: string }> {
  const parsed = parseYouTubeInput(input)

  if (parsed.type === 'playlist') {
    const videos = await fetchPlaylistVideos(parsed.value)
    return { videos, source: `playlist:${parsed.value}` }
  }

  let channelId: string
  if (parsed.type === 'handle') {
    channelId = await resolveHandle(parsed.value)
  } else {
    channelId = parsed.value
  }

  const uploadsPlaylistId = await getUploadsPlaylistId(channelId)
  const videos = await fetchPlaylistVideos(uploadsPlaylistId)
  return { videos, source: `channel:${channelId}` }
}
