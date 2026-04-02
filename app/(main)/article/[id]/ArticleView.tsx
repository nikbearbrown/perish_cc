'use client'

import { useState } from 'react'
import Link from 'next/link'
import ArticleComments from '@/components/ArticleComments'

interface Article {
  id: string
  title: string
  body: string
  tier_id: number
  tier_name: string
  tier_slug: string
  published_at: string
  hero_image_url: string | null
  is_backdated: boolean
  account_id: string
  persona_name: string
  persona_id: string
  persona_description: string
  byline_enabled: boolean
  byline_text: string | null
  byline_link: string | null
  net_votes: number
  is_bot: boolean
}

interface Comment {
  id: string
  body: string
  posted_at: string
  persona_name: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function ArticleView({
  article,
  comments: initialComments,
  userVote: initialUserVote,
  currentAccountId,
}: {
  article: Article
  comments: Comment[]
  userVote: string | null
  currentAccountId: string | null
}) {
  const [netVotes, setNetVotes] = useState(article.net_votes)
  const [userVote, setUserVote] = useState(initialUserVote)
  const [comments, setComments] = useState(initialComments)
  const [flagStatus, setFlagStatus] = useState<'idle' | 'reported' | 'already'>('idle')

  const isOwn = currentAccountId === article.account_id
  const canVote = currentAccountId && !isOwn && !userVote

  async function handleVote(direction: 'up' | 'down') {
    if (!canVote) return
    const previousNetVotes = netVotes
    const optimisticDelta = direction === 'up' ? 1 : -1
    setNetVotes(prev => prev + optimisticDelta)
    setUserVote(direction)
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id, direction }),
      })
      if (res.ok) {
        const data = await res.json()
        setNetVotes(data.net_votes)
      } else {
        setNetVotes(previousNetVotes)
        setUserVote(null)
      }
    } catch {
      setNetVotes(previousNetVotes)
      setUserVote(null)
    }
  }

  function handleCommentPosted(comment: Comment) {
    setComments(prev => [...prev, comment])
  }

  return (
    <div className="persona-shell" style={{ maxWidth: '720px' }}>
      {/* Hero image */}
      {article.hero_image_url && (
        <div className="article-hero">
          <img src={article.hero_image_url} alt={article.title} className="article-hero-img" />
        </div>
      )}

      {/* Tier pill */}
      <Link href={`/tier/${article.tier_slug}`} className="feed-tier-pill" style={{ alignSelf: 'flex-start' }}>
        {article.tier_name}
      </Link>

      {/* Title */}
      <h1 className="article-title">{article.title}</h1>

      {/* Meta */}
      <div className="article-meta">
        <Link href={`/persona/${article.persona_id}`} className="feed-persona">
          {article.is_bot ? `Inspired by ${article.persona_name}` : article.persona_name}
        </Link>
        <span className="feed-dot">·</span>
        <span>{formatDate(article.published_at)}</span>
        {article.is_backdated && <span className="feed-backdated">backdated</span>}
      </div>

      {/* Body */}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: article.body }}
      />

      {/* Tier declaration */}
      <div className="article-tier-declaration">
        Tier {article.tier_id}: {article.tier_name}
      </div>

      {/* Byline */}
      {article.byline_enabled && article.byline_text && (
        <div className="article-byline">
          {article.byline_link ? (
            <a href={article.byline_link} target="_blank" rel="noopener noreferrer" className="article-byline-link">
              {article.byline_text}
            </a>
          ) : (
            article.byline_text
          )}
        </div>
      )}

      {/* Vote */}
      <div className="article-vote-section">
        <div className="feed-vote-row" style={{ justifyContent: 'center' }}>
          <div className="feed-vote-buttons">
            {isOwn ? null : !currentAccountId ? (
              <>
                <span className="feed-vote-locked" title="Sign in to vote">▲</span>
                <span className="feed-vote-locked" title="Sign in to vote">▼</span>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleVote('up')}
                  disabled={!canVote}
                  className={`feed-vote-btn ${userVote === 'up' ? 'feed-vote-active' : ''}`}
                >
                  ▲
                </button>
                <button
                  onClick={() => handleVote('down')}
                  disabled={!canVote}
                  className={`feed-vote-btn ${userVote === 'down' ? 'feed-vote-active-down' : ''}`}
                >
                  ▼
                </button>
              </>
            )}
          </div>
          <span className="feed-net-votes">{netVotes}</span>
        </div>
      </div>

      {/* Flag */}
      {currentAccountId && !isOwn && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          {flagStatus === 'idle' ? (
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/flags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content_type: 'article', content_id: article.id }),
                  })
                  if (res.status === 201) setFlagStatus('reported')
                  else if (res.status === 409) setFlagStatus('already')
                } catch {}
              }}
              className="text-[13px]"
              style={{ color: 'var(--bb-6)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Flag
            </button>
          ) : (
            <span className="text-[13px]" style={{ color: 'var(--bb-6)' }}>
              {flagStatus === 'reported' ? 'Reported' : 'Already reported'}
            </span>
          )}
        </div>
      )}

      {/* Comments */}
      <ArticleComments
        articleId={article.id}
        initialComments={comments}
        currentAccountId={currentAccountId}
        onCommentPosted={handleCommentPosted}
      />
    </div>
  )
}
