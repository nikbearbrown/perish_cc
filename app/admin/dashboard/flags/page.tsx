'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Flag {
  id: string
  content_type: string
  content_id: string
  created_at: string
  reporter_email: string
  preview: string | null
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/flags')
        if (res.ok) setFlags(await res.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ color: 'var(--bb-6)' }}>Loading...</p>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tighter">Content Flags</h2>
      {flags.length === 0 ? (
        <p style={{ color: 'var(--bb-6)' }}>No flagged content.</p>
      ) : (
        <div className="space-y-2">
          {flags.map(flag => (
            <div key={flag.id} className="flex items-start gap-4 py-3" style={{ borderBottom: '1px solid rgba(13,13,13,0.1)' }}>
              <span className="feed-tier-pill" style={{ flexShrink: 0 }}>{flag.content_type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px]" style={{ color: 'var(--bb-1)' }}>
                  {flag.preview || '(content not found)'}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--bb-6)' }}>
                  Reported by {flag.reporter_email} · {new Date(flag.created_at).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={flag.content_type === 'article' ? `/article/${flag.content_id}` : '#'}
                className="text-[13px]"
                style={{ color: 'var(--bb-4)', textDecoration: 'underline', flexShrink: 0 }}
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
