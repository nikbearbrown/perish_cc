'use client'

import { useState, useEffect, use } from 'react'

interface Version {
  version_number: number
  created_at: string
  is_active: boolean
}

export default function PersonaEditForm({ id }: { id: string }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [promptText, setPromptText] = useState('')
  const [autoMode, setAutoMode] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [queuedSeed, setQueuedSeed] = useState('')
  const [queueInput, setQueueInput] = useState('')
  const [queueSaving, setQueueSaving] = useState(false)
  const [bylineEnabled, setBylineEnabled] = useState(false)
  const [bylineText, setBylineText] = useState('')
  const [bylineLink, setBylineLink] = useState('')
  const [currentVersion, setCurrentVersion] = useState(0)
  const [versions, setVersions] = useState<Version[]>([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/personas/${id}`)
        if (!res.ok) {
          setError('Failed to load persona')
          setLoading(false)
          return
        }
        const data = await res.json()
        setName(data.name || '')
        setDescription(data.description || '')
        setPromptText(data.prompt_text || '')
        setAutoMode(data.auto_mode || false)
        setTemperature(data.temperature ?? 0.7)
        setQueuedSeed(data.queued_seed || '')
        setQueueInput(data.queued_seed || '')
        setBylineEnabled(data.byline_enabled || false)
        setBylineText(data.byline_text || '')
        setBylineLink(data.byline_link || '')
        setCurrentVersion(data.version_number || 1)
        setVersions(data.versions || [])
      } catch {
        setError('Failed to load persona')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSuccessMessage('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/personas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          prompt_text: promptText,
          auto_mode: autoMode,
          temperature,
          byline_enabled: bylineEnabled,
          byline_text: bylineText || undefined,
          byline_link: bylineLink || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newVer = data.versionNumber
        setCurrentVersion(newVer)
        setVersions(prev => [
          { version_number: newVer, created_at: new Date().toISOString(), is_active: true },
          ...prev.map(v => ({ ...v, is_active: false })),
        ])
        setSuccessMessage(`Saved as version ${newVer}`)
        setTimeout(() => setSuccessMessage(''), 3000)
        return
      }

      const data = await res.json()
      if (data.error === 'prompt_text_required') setFieldErrors({ prompt: 'Prompt is required' })
      else setError(data.error || 'Something went wrong')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--bb-6)' }}>Loading…</p>
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="auth-label">Persona name</label>
        <input
          id="name"
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="auth-input"
        />
        {fieldErrors.name && <p className="auth-error">{fieldErrors.name}</p>}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="auth-label">Description</label>
        <input
          id="description"
          type="text"
          required
          maxLength={140}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="auth-input"
        />
        <p className="text-[13px]" style={{ color: 'var(--bb-6)' }}>One sentence. Appears on your public profile.</p>
        {fieldErrors.description && <p className="auth-error">{fieldErrors.description}</p>}
      </div>

      {/* Prompt — the primary instrument */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="flex items-baseline justify-between">
          <label htmlFor="prompt" className="persona-prompt-label">Your instrument</label>
          <span className="persona-version-tag">Version {currentVersion}</span>
        </div>
        <p className="text-[13px]" style={{ color: 'var(--bb-6)' }}>
          Currently version {currentVersion} — editing creates version {currentVersion + 1}
        </p>
        <textarea
          id="prompt"
          required
          value={promptText}
          onChange={(e) => { setPromptText(e.target.value); setSuccessMessage('') }}
          rows={16}
          className="persona-prompt"
        />
        {fieldErrors.prompt && <p className="auth-error">{fieldErrors.prompt}</p>}
      </div>

      {/* Auto mode toggle */}
      <div style={{ marginTop: '1.5rem' }}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoMode}
            onChange={(e) => setAutoMode(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--bb-1)' }}>Auto mode</span>
        </label>
        <p className="text-xs mt-1" style={{ color: 'var(--bb-2)' }}>
          Your instrument runs daily without a seed from you. Update your prompt if you don&rsquo;t like the output — there are no mulligans.
        </p>
      </div>

      {/* Temperature slider */}
      <div style={{ marginTop: '1.5rem' }}>
        <label className="text-sm font-medium" style={{ color: 'var(--bb-1)' }}>
          Temperature: {temperature.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full mt-1"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--bb-6)' }}>
          <span>Consistent</span>
          <span>Volatile</span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--bb-2)' }}>
          Higher temperature = more variance. The ceiling rises. So does the floor.
        </p>
      </div>

      {/* Queue seed (only when auto mode) */}
      {autoMode && (
        <div style={{ marginTop: '1.5rem' }}>
          <label className="text-sm font-medium" style={{ color: 'var(--bb-1)' }}>
            Next article direction (optional)
          </label>
          <textarea
            rows={3}
            value={queueInput}
            onChange={(e) => setQueueInput(e.target.value)}
            placeholder="A theme, a provocation, a question. Your instrument uses this instead of a random seed — once."
            className="w-full mt-1 p-2 border text-sm"
            style={{ borderColor: 'var(--bb-7)', fontFamily: 'inherit' }}
          />
          <button
            type="button"
            onClick={async () => {
              setQueueSaving(true)
              try {
                const res = await fetch(`/api/personas/${id}/queue`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ seed_text: queueInput }),
                })
                if (res.ok) setQueuedSeed(queueInput)
              } catch {}
              setQueueSaving(false)
            }}
            disabled={queueSaving}
            className="mt-2 px-4 py-2 text-sm"
            style={{ backgroundColor: 'var(--bb-1)', color: 'var(--bb-8)' }}
          >
            {queueSaving ? 'Saving...' : 'Queue it'}
          </button>
          {queuedSeed && (
            <div className="mt-4 text-sm" style={{ color: 'var(--bb-6)' }}>
              <p>Next run will use: &ldquo;{queuedSeed}&rdquo;</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/personas/${id}/queue`, { method: 'DELETE' })
                    if (res.ok) {
                      setQueuedSeed('')
                      setQueueInput('')
                    }
                  } catch {}
                }}
                className="text-sm mt-1"
                style={{ color: 'var(--bb-3)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear &times;
              </button>
            </div>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--bb-2)' }}>
            One slot. Submitting again overwrites the previous.
          </p>
        </div>
      )}

      {/* Byline */}
      <div className="flex flex-col gap-3 mt-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={bylineEnabled}
            onChange={(e) => setBylineEnabled(e.target.checked)}
            className="persona-checkbox"
          />
          <span className="auth-label">Enable Substack byline</span>
        </label>

        {bylineEnabled && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="byline_text" className="auth-label">Byline display text</label>
              <input
                id="byline_text"
                type="text"
                value={bylineText}
                onChange={(e) => setBylineText(e.target.value)}
                className="auth-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="byline_link" className="auth-label">Substack URL</label>
              <input
                id="byline_link"
                type="url"
                value={bylineLink}
                onChange={(e) => setBylineLink(e.target.value)}
                className="auth-input"
                placeholder="https://"
              />
            </div>
          </>
        )}
      </div>

      {error && <p className="auth-error">{error}</p>}
      {successMessage && <p className="persona-success">{successMessage}</p>}

      <button type="submit" disabled={submitting} className="auth-button mt-2">
        {submitting ? 'Saving…' : 'Save new version'}
      </button>

      {/* Version history */}
      {versions.length > 0 && (
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(13,13,13,0.15)' }}>
          <h3 className="text-[14px] font-medium mb-3" style={{ color: 'var(--bb-1)', opacity: 0.7 }}>
            Version history
          </h3>
          <ul className="flex flex-col gap-1.5">
            {versions.map(v => (
              <li key={v.version_number} className="flex items-center gap-3 text-[13px]">
                <span style={{ color: 'var(--bb-1)', opacity: v.is_active ? 1 : 0.5 }}>
                  v{v.version_number}
                </span>
                <span style={{ color: 'var(--bb-6)' }}>
                  {new Date(v.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {v.is_active && (
                  <span className="text-[11px] font-medium" style={{ color: 'var(--bb-4)' }}>active</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}
