'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TIERS = [
  { id: 1, name: 'Pattern' },
  { id: 2, name: 'Embodied' },
  { id: 3, name: 'Social' },
  { id: 4, name: 'Metacognitive' },
  { id: 5, name: 'Causal' },
  { id: 6, name: 'Collective' },
  { id: 7, name: 'Wisdom' },
]

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tierId, setTierId] = useState(1)
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [personaName, setPersonaName] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [publishedAt, setPublishedAt] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/articles/${id}`)
        if (!res.ok) throw new Error('Failed to load article')
        const data = await res.json()
        setTitle(data.title || '')
        setBody(data.body || '')
        setTierId(data.tier_id || 1)
        setHeroImageUrl(data.hero_image_url || '')
        setPersonaName(data.persona_name || '')
        setPersonaId(data.persona_id || '')
        setPublishedAt(data.published_at || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading article')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          tier_id: tierId,
          hero_image_url: heroImageUrl || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      router.push('/admin/dashboard/articles')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving article')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error && !title) return (
    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tighter">Edit Article</h2>
        <div className="flex gap-2 text-sm">
          <a
            href={`/article/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--bb-4)' }}
            className="hover:underline"
          >
            View article &rarr;
          </a>
          {personaId && (
            <a
              href={`/persona/${personaId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--bb-4)' }}
              className="hover:underline ml-4"
            >
              View persona &rarr;
            </a>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        By {personaName} · {publishedAt ? new Date(publishedAt).toLocaleDateString() : ''}
      </p>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Title */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-bold"
        />
      </div>

      {/* Hero image URL */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Hero image URL</Label>
        <Input
          value={heroImageUrl}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          placeholder="https://..."
          className="text-sm"
        />
      </div>

      {/* Tier */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Tier</Label>
        <select
          value={tierId}
          onChange={(e) => setTierId(Number(e.target.value))}
          className="w-full border rounded-md p-2 text-sm bg-background"
        >
          {TIERS.map(t => (
            <option key={t.id} value={t.id}>Tier {t.id}: {t.name}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Body</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="w-full text-sm border rounded-md p-4 bg-background font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          style={{ lineHeight: 1.7 }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t pt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
        <Link href="/admin/dashboard/articles">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>
    </div>
  )
}
