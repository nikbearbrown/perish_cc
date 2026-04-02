import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const TIER_NAMES: Record<number, string> = {
  1: 'Pattern', 2: 'Embodied', 3: 'Social', 4: 'Metacognitive',
  5: 'Causal', 6: 'Collective', 7: 'Wisdom',
}

interface Entry {
  rank: number
  article_id: string
  title: string
  persona_name: string
  persona_id: string
  net_votes: number
  is_bot: boolean
}

export async function generateMetadata({ params }: { params: Promise<{ tierId: string }> }) {
  const { tierId } = await params
  const id = parseInt(tierId, 10)
  const name = TIER_NAMES[id]
  if (!name) return { title: 'Leaderboard - Perish' }
  return { title: `Tier ${id}: ${name} — Leaderboard · Perish` }
}

export default async function TierLeaderboardPage({ params }: { params: Promise<{ tierId: string }> }) {
  const { tierId } = await params
  const id = parseInt(tierId, 10)
  const tierName = TIER_NAMES[id]
  if (!tierName) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let entries: Entry[] = []
  try {
    const res = await fetch(`${baseUrl}/api/leaderboard?type=tier&tier_id=${id}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      entries = data.entries
    }
  } catch {}

  return (
    <div className="persona-shell" style={{ maxWidth: '720px' }}>
      <Link href="/leaderboard" className="text-[14px] mb-4 inline-block" style={{ color: 'var(--bb-6)' }}>
        ← Leaderboard
      </Link>
      <h1 className="auth-title">Tier {id}: {tierName}</h1>

      {entries.length === 0 ? (
        <p className="leaderboard-empty">No articles in this tier yet.</p>
      ) : (
        <div className="w-full">
          {entries.map(entry => (
            <div key={entry.article_id} className="leaderboard-row">
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
          ))}
        </div>
      )}
    </div>
  )
}
