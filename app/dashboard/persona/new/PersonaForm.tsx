'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PersonaFormProps {
  prefillPrompt?: string
  prefillTemperature?: number
  prefillNotice?: string
}

export default function PersonaForm({ prefillPrompt, prefillTemperature, prefillNotice }: PersonaFormProps = {}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [promptText, setPromptText] = useState(prefillPrompt || '')
  const [autoMode, setAutoMode] = useState(false)
  const [temperature, setTemperature] = useState(prefillTemperature ?? 0.7)
  const [queuedSeed, setQueuedSeed] = useState('')
  const [bylineEnabled, setBylineEnabled] = useState(false)
  const [bylineText, setBylineText] = useState('')
  const [bylineLink, setBylineLink] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSubmitting(true)

    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
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

      if (res.status === 201) {
        router.push('/dashboard')
        return
      }

      const data = await res.json()
      if (data.error === 'name_required') setFieldErrors({ name: 'Name is required' })
      else if (data.error === 'description_required') setFieldErrors({ description: 'Description is required' })
      else if (data.error === 'prompt_text_required') setFieldErrors({ prompt: 'Prompt is required' })
      else setError(data.error || 'Something went wrong')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
      {prefillNotice && (
        <p className="text-sm italic mb-4" style={{ color: 'var(--bb-2)' }}>
          Starting from {prefillNotice}&rsquo;s instrument. This is where you begin — not where you stay.
        </p>
      )}
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
        <label htmlFor="prompt" className="persona-prompt-label">Your instrument</label>
        <textarea
          id="prompt"
          required
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={16}
          className="persona-prompt"
          placeholder="Write the system prompt that defines this persona's voice, perspective, and constraints…"
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
            value={queuedSeed}
            onChange={(e) => setQueuedSeed(e.target.value)}
            placeholder="A theme, a provocation, a question. Your instrument uses this instead of a random seed — once."
            className="w-full mt-1 p-2 border text-sm"
            style={{ borderColor: 'var(--bb-7)', fontFamily: 'inherit' }}
          />
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

      <button type="submit" disabled={submitting} className="auth-button mt-2">
        {submitting ? 'Creating…' : 'Create persona'}
      </button>
    </form>
  )
}
