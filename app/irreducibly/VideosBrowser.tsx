'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Video {
  id: string
  title: string
  description: string | null
  youtube_id: string
  tags: string[] | null
  pinned: boolean
  published_at: string | null
}

const SPECIAL_TAGS = ['botspeak', 'causal reasoning', 'ethical play', 'aimagineering', 'embodied teaching']
const PAGE_SIZE = 5

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function VideosBrowser({
  pinnedVideos: initialPinned,
  initialVideos,
  initialTotal,
}: {
  pinnedVideos: Video[]
  initialVideos: Video[]
  initialTotal: number
}) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [pinned, setPinned] = useState<Video[]>(initialPinned)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchVideos = useCallback(async (p: number, tag: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (tag) params.set('tag', tag)
      const res = await fetch(`/api/videos?${params}`)
      const data = await res.json()
      setVideos(data.videos)
      setPinned(data.pinned)
      setTotal(data.total)
    } catch {
      // keep current state on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Skip fetch on initial render (we have server data)
    if (page === 1 && activeTag === null) return
    fetchVideos(page, activeTag)
  }, [page, activeTag, fetchVideos])

  function handleTagClick(tag: string) {
    if (activeTag === tag) {
      setActiveTag(null)
    } else {
      setActiveTag(tag)
    }
    setPage(1)
  }

  // Client-side search filter on current page results
  const filteredVideos = query.trim()
    ? videos.filter(v => {
        const q = query.toLowerCase()
        return (
          v.title.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          v.tags?.some(t => t.toLowerCase().includes(q))
        )
      })
    : videos

  return (
    <>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos..."
          className="w-full pl-10 pr-10 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SPECIAL_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              activeTag === tag
                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                : 'bg-background text-foreground/70 hover:bg-accent border-input'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Pinned video */}
      {pinned.length > 0 && (
        <div className="mb-10">
          {pinned.map(v => (
            <div key={v.id}>
              <h2 className="text-xl font-semibold mb-3">{v.title}</h2>
              <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src={`https://www.youtube.com/embed/${v.youtube_id}`}
                  title={v.title}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              {v.description && (
                <p className="text-muted-foreground mt-3">{v.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Video list */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filteredVideos.length === 0 ? (
        <p className="text-muted-foreground">
          {query ? `No videos matching "${query}".` : activeTag ? `No videos tagged "${activeTag}".` : 'No videos yet. Check back soon.'}
        </p>
      ) : (
        <div className="space-y-10">
          {filteredVideos.map(v => (
            <article key={v.id} className="space-y-3">
              <div className="aspect-video rounded-lg overflow-hidden shadow-md">
                <iframe
                  src={`https://www.youtube.com/embed/${v.youtube_id}`}
                  title={v.title}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{v.title}</h3>
                {v.published_at && (
                  <time className="text-sm text-muted-foreground">{formatDate(v.published_at)}</time>
                )}
                {v.description && (
                  <p className="text-muted-foreground mt-1">{v.description}</p>
                )}
                {v.tags && v.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {v.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}
