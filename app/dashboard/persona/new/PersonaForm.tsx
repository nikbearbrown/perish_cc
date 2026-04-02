'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PersonaForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [promptText, setPromptText] = useState('')
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
