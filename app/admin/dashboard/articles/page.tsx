'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Pencil } from 'lucide-react'

const TIERS: Record<number, string> = {
  1: 'Pattern', 2: 'Embodied', 3: 'Social', 4: 'Metacognitive',
  5: 'Causal', 6: 'Collective', 7: 'Wisdom',
}

interface Article {
  id: string
  title: string
  published_at: string
  tier_id: number
  persona_name: string
  is_bot: boolean
  net_votes: number
  seed_source: string | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function ArticlesAdminPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'bot' | 'human'>('all')
  const [filterTier, setFilterTier] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/articles')
        if (!res.ok) throw new Error('Failed to load articles')
        setArticles(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading articles')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = articles
    if (filterType === 'bot') result = result.filter(a => a.is_bot)
    if (filterType === 'human') result = result.filter(a => !a.is_bot)
    if (filterTier !== null) result = result.filter(a => a.tier_id === filterTier)
    return result
  }, [articles, filterType, filterTier])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tighter">Articles</h2>
        <p className="text-sm text-muted-foreground">
          Manage game articles published by players and bots
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5">
          <Badge
            variant={filterType === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterType('all')}
          >
            All
          </Badge>
          <Badge
            variant={filterType === 'bot' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterType('bot')}
          >
            Bots
          </Badge>
          <Badge
            variant={filterType === 'human' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterType('human')}
          >
            Human
          </Badge>
        </div>
        <span className="w-px h-5" style={{ backgroundColor: 'var(--bb-7)' }} />
        <div className="flex gap-1.5">
          <Badge
            variant={filterTier === null ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterTier(null)}
          >
            All tiers
          </Badge>
          {Object.entries(TIERS).map(([id, name]) => (
            <Badge
              key={id}
              variant={filterTier === Number(id) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setFilterTier(filterTier === Number(id) ? null : Number(id))}
            >
              {name}
            </Badge>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No articles found.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((article) => (
            <Card key={article.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {article.title}
                    <Badge variant="outline" className="text-[10px]">
                      {TIERS[article.tier_id] || `Tier ${article.tier_id}`}
                    </Badge>
                    {article.is_bot && (
                      <Badge variant="secondary" className="text-[10px]">Bot</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {article.net_votes > 0 ? '+' : ''}{article.net_votes} votes
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {article.is_bot ? `Inspired by ${article.persona_name}` : article.persona_name}
                    {' · '}
                    {formatDate(article.published_at)}
                    {article.seed_source && article.seed_source !== 'manual' && (
                      <> · <span className="italic">{article.seed_source}</span></>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link href={`/admin/dashboard/articles/${article.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
