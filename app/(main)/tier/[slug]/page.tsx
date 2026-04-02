import Link from 'next/link'
import { notFound } from 'next/navigation'
import { perishSql } from '@/lib/db-perish'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const rows = await perishSql`SELECT name, description FROM tiers WHERE slug = ${slug}`
    if (rows.length > 0) {
      return { title: `${rows[0].name} — Perish`, description: rows[0].description }
    }
  } catch {}
  return { title: 'Tier - Perish' }
}

interface ArticleCard {
  id: string
  title: string
  tier_name: string
  tier_slug: string
  published_at: string
  persona_name: string
  persona_id: string
  net_votes: number
  is_bot: boolean
  is_backdated: boolean
  hero_image_url: string | null
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return `${Math.floor(diffDay / 30)}mo ago`
}

export default async function TierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let data
  try {
    const res = await fetch(`${baseUrl}/api/tiers/${slug}`, { cache: 'no-store' })
    if (!res.ok) notFound()
    data = await res.json()
  } catch {
    notFound()
  }

  const { id, name, page_content, recent_articles: articles } = data

  return (
    <div className="persona-shell" style={{ maxWidth: '720px' }}>
      <h1 className="article-title" style={{ alignSelf: 'flex-start', marginBottom: '1.5rem' }}>{name}</h1>

      {/* Essay content */}
      {page_content && (
        <div className="prose prose-neutral dark:prose-invert max-w-none mb-10 w-full">
          {page_content.split('\n\n').filter((p: string) => p.trim()).map((paragraph: string, i: number) => (
            <p key={i}>{paragraph.trim()}</p>
          ))}
        </div>
      )}

      {/* Recent articles */}
      <div className="w-full">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="profile-section-heading" style={{ marginBottom: 0 }}>Recent Articles</h2>
          <Link
            href={`/feed?tier_id=${id}`}
            className="text-[13px]"
            style={{ color: 'var(--bb-4)', textDecoration: 'none' }}
          >
            All articles in this tier →
          </Link>
        </div>

        {(articles as ArticleCard[]).length === 0 ? (
          <p className="leaderboard-empty">No articles in this tier yet.</p>
        ) : (
          <div className="flex flex-col">
            {(articles as ArticleCard[]).map(article => (
              <div key={article.id} className="feed-card">
                <div className="feed-card-row">
                  <div className="feed-card-content">
                    <Link href={`/article/${article.id}`} className="feed-title">
                      {article.title}
                    </Link>
                    <div className="feed-meta">
                      <Link href={`/persona/${article.persona_id}`} className="feed-persona">
                        {article.is_bot ? `Inspired by ${article.persona_name}` : article.persona_name}
                      </Link>
                      <span className="feed-dot">·</span>
                      <span>{relativeTime(article.published_at)}</span>
                      <span className="feed-dot">·</span>
                      <span>{article.net_votes} vote{article.net_votes !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {article.hero_image_url && (
                    <img src={article.hero_image_url} alt="" className="feed-thumb" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
