'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface ArticleCard {
  id: string
  title: string
  tier_id: number
  tier_name: string
  tier_slug: string
  published_at: string
  persona_name: string
  persona_id: string
  account_id: string
  net_votes: number
  is_bot: boolean
  is_backdated: boolean
  hero_image_url: string | null
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMo = Math.floor(diffDay / 30)
  return `${diffMo}mo ago`
}

interface Props {
  initialArticles: ArticleCard[]
  initialHasMore: boolean
  initialTotal: number
}

export default function FeedClient({ initialArticles, initialHasMore, initialTotal }: Props) {
  const [sort, setSort] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('perish_feed_sort') || 'recent'
    }
    return 'recent'
  })
  const [articles, setArticles] = useState<ArticleCard[]>(initialArticles)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [votedArticles, setVotedArticles] = useState<Record<string, 'up' | 'down'>>({})
  const [votesRemaining, setVotesRemaining] = useState<number | null>(null)

  // Fetch articles when sort changes (skip initial render for 'recent' since we have SSR data)
  const [initialLoad, setInitialLoad] = useState(true)
  useEffect(() => {
    if (initialLoad) {
      // On first mount, if sort is not 'recent', fetch the correct sort
      if (sort !== 'recent') {
        fetchSorted(sort)
      }
      setInitialLoad(false)
      return
    }
    fetchSorted(sort)
  }, [sort])

  async function fetchSorted(s: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/feed?page=1&limit=20&sort=${s}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.articles)
        setHasMore(data.has_more)
        setPage(1)
      }
    } catch {}
    setLoading(false)
  }

  function handleSortChange(newSort: string) {
    if (newSort === sort) return
    sessionStorage.setItem('perish_feed_sort', newSort)
    setSort(newSort)
  }

  // Check session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setCurrentAccountId(data.accountId)
          setVotesRemaining(data.votes_remaining ?? null)
        }
      } catch {}
    }
    checkSession()
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const nextPage = page + 1
    try {
      const res = await fetch(`/api/feed?page=${nextPage}&limit=20&sort=${sort}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(prev => [...prev, ...data.articles])
        setHasMore(data.has_more)
        setPage(nextPage)
      }
    } catch {}
    setLoading(false)
  }, [page, hasMore, loading, sort])

  async function handleVote(articleId: string, direction: 'up' | 'down') {
    if (!currentAccountId) return

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, direction }),
      })

      if (res.ok) {
        const data = await res.json()
        setVotedArticles(prev => ({ ...prev, [articleId]: direction }))
        setVotesRemaining(data.votes_remaining)
        setArticles(prev =>
          prev.map(a => a.id === articleId ? { ...a, net_votes: data.net_votes } : a)
        )
      }
    } catch {}
  }

  const sortButtons = (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {([
        { key: 'recent', label: 'Recent' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
      ] as const).map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleSortChange(key)}
          className={sort === key ? 'auth-button' : 'seed-regen-button'}
          style={sort === key
            ? { fontSize: '14px', padding: '6px 14px' }
            : { fontSize: '14px', padding: '6px 14px' }
          }
        >
          {label}
        </button>
      ))}
    </div>
  )

  if (articles.length === 0) {
    return (
      <div className="w-full flex flex-col">
        {sortButtons}
        <p className="text-center" style={{ color: 'var(--bb-6)', fontSize: '15px' }}>
          {sort === 'week' || sort === 'month'
            ? 'No articles earned votes this period.'
            : 'No articles yet. Be the first to publish.'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col">
      {sortButtons}
      {articles.map(article => {
        const isOwn = currentAccountId === article.account_id
        const hasVoted = votedArticles[article.id]
        const canVote = currentAccountId && !isOwn && !hasVoted

        return (
          <article key={article.id} className="feed-card">
            <div className="feed-card-row">
              <div className="feed-card-content">
                {/* Tier pill */}
                <Link href={`/tier/${article.tier_slug}`} className="feed-tier-pill">
                  {article.tier_name}
                </Link>

                {/* Title */}
                <Link href={`/article/${article.id}`} className="feed-title">
                  {article.title}
                </Link>

                {/* Meta line */}
                <div className="feed-meta">
              <Link href={`/persona/${article.persona_id}`} className="feed-persona">
                {article.is_bot ? `Inspired by ${article.persona_name}` : article.persona_name}
              </Link>
              <span className="feed-dot">·</span>
              <span>{relativeTime(article.published_at)}</span>
              {article.is_backdated && <span className="feed-backdated">backdated</span>}
            </div>
              </div>
              {article.hero_image_url && (
                <img src={article.hero_image_url} alt="" className="feed-thumb" />
              )}
            </div>

            {/* Vote row */}
            <div className="feed-vote-row">
              <div className="feed-vote-buttons">
                {isOwn ? (
                  // No vote buttons for own articles
                  null
                ) : !currentAccountId ? (
                  // Logged out: locked indicators
                  <>
                    <span className="feed-vote-locked" title="Sign in to vote">▲</span>
                    <span className="feed-vote-locked" title="Sign in to vote">▼</span>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleVote(article.id, 'up')}
                      disabled={!canVote || votesRemaining === 0}
                      className={`feed-vote-btn ${hasVoted === 'up' ? 'feed-vote-active' : ''}`}
                      title={hasVoted ? 'Already voted' : votesRemaining === 0 ? 'No votes remaining today' : 'Upvote'}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleVote(article.id, 'down')}
                      disabled={!canVote || votesRemaining === 0}
                      className={`feed-vote-btn ${hasVoted === 'down' ? 'feed-vote-active-down' : ''}`}
                      title={hasVoted ? 'Already voted' : votesRemaining === 0 ? 'No votes remaining today' : 'Downvote'}
                    >
                      ▼
                    </button>
                  </>
                )}
              </div>
              <span className="feed-net-votes">{article.net_votes}</span>
            </div>
          </article>
        )
      })}

      {hasMore && (
        <button onClick={loadMore} disabled={loading} className="feed-load-more">
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
