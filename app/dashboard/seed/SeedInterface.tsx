'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const TIERS = [
  { id: 1, name: 'Pattern' },
  { id: 2, name: 'Embodied' },
  { id: 3, name: 'Social' },
  { id: 4, name: 'Metacognitive' },
  { id: 5, name: 'Causal' },
  { id: 6, name: 'Collective' },
  { id: 7, name: 'Wisdom' },
]

type Phase = 'default' | 'generating' | 'review' | 'published' | 'already_seeded'

interface Persona {
  id: string
  name: string
}

export default function SeedInterface() {
  const [phase, setPhase] = useState<Phase>('default')
  const [seedText, setSeedText] = useState('')
  const [tierId, setTierId] = useState(1)
  const [personaId, setPersonaId] = useState('')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [generatedText, setGeneratedText] = useState('')
  const [generationId, setGenerationId] = useState('')
  const [regenUsed, setRegenUsed] = useState(false)
  const [articleId, setArticleId] = useState('')
  const [error, setError] = useState('')
  const [loadingPersonas, setLoadingPersonas] = useState(true)

  // Load user's personas
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/personas/mine')
        if (res.ok) {
          const data = await res.json()
          setPersonas(data)
          if (data.length > 0) setPersonaId(data[0].id)
        }
      } catch {
        // silent
      } finally {
        setLoadingPersonas(false)
      }
    }
    load()
  }, [])

  async function handleGenerate() {
    setError('')
    setPhase('generating')

    try {
      const res = await fetch('/api/articles/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed_text: seedText, tier_id: tierId, persona_id: personaId }),
      })

      const data = await res.json()

      if (res.status === 409 && data.error === 'already_seeded') {
        setPhase('already_seeded')
        return
      }

      if (!res.ok) {
        const code = data.error
        if (code === 'api_unavailable') {
          setError("The instrument couldn't connect. Try again in a few minutes.")
        } else if (code === 'prompt_too_long' || code === 'context_window_exceeded') {
          setError('Your persona prompt is too long for this generation. Shorten your instrument and try again.')
        } else {
          setError(data.message || data.error || 'Generation failed')
        }
        setPhase('default')
        return
      }

      setGeneratedText(data.generated_text)
      setGenerationId(data.generation_id)
      setPhase('review')
    } catch {
      setError('Something went wrong. Please try again.')
      setPhase('default')
    }
  }

  async function handleRegenerate() {
    setError('')
    setPhase('generating')

    try {
      const res = await fetch('/api/articles/seed/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: generationId, seed_text: seedText, persona_id: personaId }),
      })

      const data = await res.json()

      if (res.status === 409) {
        setRegenUsed(true)
        setPhase('review')
        return
      }

      if (!res.ok) {
        const code = data.error
        if (code === 'api_unavailable') {
          setError("The instrument couldn't connect. Try again in a few minutes.")
        } else if (code === 'prompt_too_long' || code === 'context_window_exceeded') {
          setError('Your persona prompt is too long for this generation. Shorten your instrument and try again.')
        } else {
          setError(data.message || data.error || 'Regeneration failed')
        }
        setPhase('review')
        return
      }

      setGeneratedText(data.generated_text)
      setGenerationId(data.generation_id)
      setRegenUsed(true)
      setPhase('review')
    } catch {
      setError('Something went wrong.')
      setPhase('review')
    }
  }

  async function handlePublish() {
    setError('')

    try {
      const res = await fetch('/api/articles/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: generationId, tier_id: tierId, persona_id: personaId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || 'Publishing failed')
        return
      }

      setArticleId(data.articleId)
      setPhase('published')
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  // --- ALREADY SEEDED ---
  if (phase === 'already_seeded') {
    return (
      <div className="seed-message">
        <p>One article per day. Come back tomorrow.</p>
      </div>
    )
  }

  // --- PUBLISHED ---
  if (phase === 'published') {
    return (
      <div className="seed-message">
        <p>Published today. See you tomorrow.</p>
        {articleId && (
          <Link href={`/article/${articleId}`} className="seed-article-link">
            View your article →
          </Link>
        )}
      </div>
    )
  }

  // --- GENERATING ---
  if (phase === 'generating') {
    return (
      <div className="seed-message">
        <p className="seed-generating-text">Your instrument is writing.</p>
      </div>
    )
  }

  // --- REVIEW ---
  if (phase === 'review') {
    return (
      <div className="w-full flex flex-col gap-6">
        <div className="seed-preview">
          <div className="seed-preview-content" dangerouslySetInnerHTML={{
            __html: generatedText
              .replace(/^# (.+)$/gm, '<h1>$1</h1>')
              .replace(/^## (.+)$/gm, '<h2>$1</h2>')
              .replace(/^### (.+)$/gm, '<h3>$1</h3>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/^/, '<p>')
              .replace(/$/, '</p>')
          }} />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handlePublish} className="auth-button flex-1">
            Publish
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenUsed}
            className="seed-regen-button flex-1"
          >
            {regenUsed ? 'Regeneration used' : 'Regenerate'}
          </button>
        </div>

        <button
          onClick={() => { setPhase('default'); setGeneratedText(''); setGenerationId('') }}
          className="seed-back-button"
        >
          ← Back to seed
        </button>
      </div>
    )
  }

  // --- DEFAULT ---
  return (
    <div className="w-full flex flex-col gap-6">
      {loadingPersonas ? (
        <p style={{ color: 'var(--bb-6)' }}>Loading…</p>
      ) : personas.length === 0 ? (
        <div className="seed-message">
          <p>Create a persona before seeding.</p>
          <Link href="/dashboard/persona/new" className="seed-article-link">
            Create persona →
          </Link>
        </div>
      ) : (
        <>
          {/* Persona selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="persona" className="auth-label">Persona</label>
            <select
              id="persona"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
              className="auth-input"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Tier selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tier" className="auth-label">Tier</label>
            <select
              id="tier"
              value={tierId}
              onChange={(e) => setTierId(Number(e.target.value))}
              className="auth-input"
            >
              {TIERS.map(t => (
                <option key={t.id} value={t.id}>Tier {t.id}: {t.name}</option>
              ))}
            </select>
          </div>

          {/* Seed text */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="seed" className="auth-label">Seed</label>
            <textarea
              id="seed"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              rows={4}
              className="seed-textarea"
              placeholder="A topic, question, or provocation to direct your instrument…"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={!seedText.trim() || !personaId}
            className="auth-button"
          >
            Generate
          </button>
        </>
      )}
    </div>
  )
}
