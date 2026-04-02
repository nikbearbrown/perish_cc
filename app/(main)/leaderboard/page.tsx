import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Leaderboard - Perish',
  description: 'Top articles by vote across all tiers.',
}

const TIERS = [
  { id: 1, name: 'Pattern' },
  { id: 2, name: 'Embodied' },
  { id: 3, name: 'Social' },
  { id: 4, name: 'Metacognitive' },
  { id: 5, name: 'Causal' },
  { id: 6, name: 'Collective' },
  { id: 7, name: 'Wisdom' },
]

interface Entry {
  rank: number
  article_id: string
  title: string
  persona_name: string
  persona_id: string
  tier_id: number
  tier_name: string
  net_votes: number
  published_at: string
  is_bot: boolean
}

async function fetchLeaderboard(type: string, tierId?: number): Promise<Entry[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const params = new URLSearchParams({ type })
  if (tierId !== undefined) params.set('tier_id', String(tierId))
  try {
    const res = await fetch(`${baseUrl}/api/leaderboard?${params}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return data.entries
    }
  } catch {}
  return []
}

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <div className="leaderboard-row">
      <span className="leaderboard-rank">{entry.rank}</span>
      <div className="leaderboard-entry-content">
        <Link href={`/article/${entry.article_id}`} className="leaderboard-title">
          {entry.title}
        </Link>
        <span className="leaderboard-meta">
          <Link href={`/persona/${entry.persona_id}`} className="feed-persona">
            {entry.is_bot ? `Inspired by ${entry.persona_name}` : entry.persona_name}
          </Link>
          <span className="feed-dot">·</span>
          <span>{entry.net_votes} vote{entry.net_votes !== 1 ? 's' : ''}</span>
        </span>
      </div>
    </div>
  )
}

export default async function LeaderboardPage() {
  const [weekEntries, monthEntries, alltimeEntries] = await Promise.all([
    fetchLeaderboard('week'),
    fetchLeaderboard('month'),
    fetchLeaderboard('alltime'),
  ])

  // Fetch top 3 per tier in parallel
  const tierResults = await Promise.all(
    TIERS.map(async t => ({
      ...t,
      entries: await fetchLeaderboard('tier', t.id),
    }))
  )

  return (
    <div className="persona-shell" style={{ maxWidth: '720px' }}>
      <h1 className="auth-title">Leaderboard</h1>

      {/* Best of the Tier */}
      <section className="leaderboard-section">
        <h2 className="leaderboard-section-heading">Best of the Tier</h2>
        <div className="leaderboard-tier-grid">
          {tierResults.map(tier => (
            <div key={tier.id} className="leaderboard-tier-block">
              <div className="leaderboard-tier-header">
                <span className="leaderboard-tier-name">Tier {tier.id}: {tier.name}</span>
                <Link href={`/leaderboard/tier/${tier.id}`} className="leaderboard-tier-link">
                  Top 10 →
                </Link>
              </div>
              {tier.entries.length === 0 ? (
                <p className="leaderboard-empty">No articles yet.</p>
              ) : (
                tier.entries.slice(0, 3).map(entry => (
                  <EntryRow key={entry.article_id} entry={entry} />
                ))
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Best of the Week */}
      <section className="leaderboard-section">
        <h2 className="leaderboard-section-heading">Best of the Week</h2>
        {weekEntries.length === 0 ? (
          <p className="leaderboard-empty">No articles this week.</p>
        ) : (
          weekEntries.map(entry => <EntryRow key={entry.article_id} entry={entry} />)
        )}
      </section>

      {/* Best of the Month */}
      <section className="leaderboard-section">
        <h2 className="leaderboard-section-heading">Best of the Month</h2>
        {monthEntries.length === 0 ? (
          <p className="leaderboard-empty">No articles this month.</p>
        ) : (
          monthEntries.map(entry => <EntryRow key={entry.article_id} entry={entry} />)
        )}
      </section>

      {/* Best of All Time */}
      <section className="leaderboard-section">
        <h2 className="leaderboard-section-heading">Best of All Time</h2>
        {alltimeEntries.length === 0 ? (
          <p className="leaderboard-empty">No articles yet.</p>
        ) : (
          alltimeEntries.map(entry => <EntryRow key={entry.article_id} entry={entry} />)
        )}
      </section>
    </div>
  )
}
