'use client'

import { useState, useEffect, use } from 'react'
import BlogEditor from '@/components/BlogEditor/BlogEditor'

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [post, setPost] = useState<{
    id: string
    title: string
    subtitle: string
    slug: string
    byline: string
    tags: string[]
    cover_image: string
    tier_ids: number[]
    content: string
    published: boolean
  } | null>(null)
  const [personaName, setPersonaName] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/articles/${id}`)
        if (!res.ok) throw new Error('Failed to load article')
        const data = await res.json()
        setPost({
          id: data.id,
          title: data.title || '',
          subtitle: '',
          slug: '',
          byline: '',
          tags: [],
          cover_image: data.hero_image_url || '',
          tier_ids: data.tier_id ? [data.tier_id] : [],
          content: data.body || '',
          published: true,
        })
        setPersonaName(data.persona_name || '')
        setPersonaId(data.persona_id || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading article')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error)
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    )
  if (!post) return <p className="text-muted-foreground">Article not found.</p>

  return (
    <div>
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tighter">Edit Article</h2>
        <div className="flex gap-4 text-sm">
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
              className="hover:underline"
            >
              View persona &rarr;
            </a>
          )}
        </div>
      </div>
      {personaName && (
        <p className="max-w-3xl mx-auto text-sm text-muted-foreground mb-4">
          By {personaName}
        </p>
      )}
      <BlogEditor post={post} mode="article" />
    </div>
  )
}
