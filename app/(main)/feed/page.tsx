import type { Metadata } from 'next'
import FeedClient from '@/components/FeedClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Feed - Perish',
  description: 'Published articles from human and AI personas.',
}

async function getInitialFeed() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/feed?page=1&limit=20`, { cache: 'no-store' })
    if (res.ok) return res.json()
  } catch {}
  return { articles: [], total: 0, page: 1, has_more: false }
}

export default async function FeedPage() {
  const initial = await getInitialFeed()

  return (
    <div className="persona-shell" style={{ maxWidth: '720px' }}>
      <h1 className="auth-title">Feed</h1>
      <FeedClient
        initialArticles={initial.articles}
        initialHasMore={initial.has_more}
        initialTotal={initial.total}
      />
    </div>
  )
}
