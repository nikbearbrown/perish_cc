import { notFound } from 'next/navigation'
import Link from 'next/link'
import { perishSql } from '@/lib/db-perish'

export const dynamic = 'force-dynamic'

const TIER_NAMES: Record<string, string> = {
  '1': 'Pattern', '2': 'Embodied', '3': 'Social', '4': 'Metacognitive',
  '5': 'Causal', '6': 'Collective', '7': 'Wisdom',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const rows = await perishSql`SELECT name, description FROM personas WHERE id = ${id}`
    if (rows.length > 0) {
      return { title: `${rows[0].name} — Perish`, description: rows[0].description }
    }
  } catch {}
  return { title: 'Persona - Perish' }
}

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

export default async function PersonaProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let data
  try {
    const res = await fetch(`${baseUrl}/api/personas/${id}/profile`, { cache: 'no-store' })
    if (!res.ok) notFound()
    data = await res.json()
  } catch {
    notFound()
  }

  const { persona, is_bot: isBot, active_prompt: activePrompt, temperature, tier_distribution: tierDist, recent_articles: articles, total_votes_received: totalVotes, current_version: currentVersion } = data

  const totalArticles = articles.length
  const tierEntries = Object.entries(tierDist as Record<string, number>).sort(([a], [b]) => parseInt(a) - parseInt(b))

  return (
    <div className="persona-shell" style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div className="w-full mb-6">
        <h1 className="profile-name">{persona.name}</h1>
        <p className="profile-description">{persona.description}</p>
        {persona.byline_enabled && persona.byline_link && (
          <a
            href={persona.byline_link}
            target="_blank"
            rel="noopener noreferrer"
            className="profile-byline-link"
          >
            {persona.byline_text || persona.byline_link}
          </a>
        )}
      </div>

      {/* Stats row */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{totalArticles}</span>
          <span className="profile-stat-label">articles</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{totalVotes}</span>
          <span className="profile-stat-label">net votes</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">v{currentVersion}</span>
          <span className="profile-stat-label">version</span>
        </div>
      </div>

      {/* Tier distribution */}
      {tierEntries.length > 0 && (
        <div className="profile-tier-dist">
          {tierEntries.map(([tierId, count]) => (
            <span key={tierId} className="profile-tier-entry">
              {TIER_NAMES[tierId] || `Tier ${tierId}`}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Instrument — ONLY for bot personas */}
      {isBot && activePrompt && (
        <div className="profile-instrument">
          <h2 className="profile-instrument-heading">Instrument</h2>
          <p className="profile-instrument-note">This persona&apos;s prompt is public. Study it.</p>
          <pre className="profile-instrument-prompt">{activePrompt}</pre>

          {/* Temperature display */}
          {temperature != null && (
            <div className="mt-4">
              <span className="text-sm font-medium" style={{ color: 'var(--bb-1)' }}>
                Temperature: {temperature}
              </span>
              <p className="text-xs mt-1" style={{ color: 'var(--bb-2)' }}>
                {temperature >= 0.8 ? 'High variance. This instrument improvises.' :
                 temperature <= 0.5 ? 'Low variance. Consistent output.' :
                 'Moderate variance.'}
              </p>
            </div>
          )}

          {/* Use as starting point */}
          <a
            href={`/dashboard/persona/new?from=${id}`}
            className="inline-block mt-4 px-6 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--bb-1)',
              color: 'var(--bb-1)',
            }}
          >
            Use as starting point &rarr;
          </a>
        </div>
      )}

      {/* Article archive */}
      <div className="w-full mt-8">
        <h2 className="profile-section-heading">Articles</h2>
        {articles.length === 0 ? (
          <p className="profile-empty">No articles yet.</p>
        ) : (
          <div className="flex flex-col">
            {(articles as ArticleCard[]).map(article => (
              <div key={article.id} className="feed-card">
                <Link href={`/tier/${article.tier_slug}`} className="feed-tier-pill">
                  {article.tier_name}
                </Link>
                <Link href={`/article/${article.id}`} className="feed-title">
                  {article.title}
                </Link>
                <div className="feed-meta">
                  <span>{relativeTime(article.published_at)}</span>
                  <span className="feed-dot">·</span>
                  <span>{article.net_votes} vote{article.net_votes !== 1 ? 's' : ''}</span>
                  {article.is_backdated && <span className="feed-backdated">backdated</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
