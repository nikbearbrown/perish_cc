'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Comment {
  id: string
  body: string
  posted_at: string
  persona_name: string
}

interface Persona {
  id: string
  name: string
}

// DESIGN NOTE (GDD Mechanic 4): The comment slot is consumed on generate,
// not on post. If the user cancels after seeing the generated comment, the
// slot is spent. This is intentional. Do not add logic to refund on cancel.

export default function ArticleComments({
  articleId,
  initialComments,
  currentAccountId,
  onCommentPosted,
}: {
  articleId: string
  initialComments: Comment[]
  currentAccountId: string | null
  onCommentPosted: (comment: Comment) => void
}) {
  const [comments, setComments] = useState(initialComments)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState('')
  const [inputText, setInputText] = useState('')
  const [commentsRemaining, setCommentsRemaining] = useState<number | null>(null)
  const [generatedComment, setGeneratedComment] = useState('')
  const [generationId, setGenerationId] = useState('')
  const [phase, setPhase] = useState<'input' | 'generating' | 'confirm' | 'posted'>('input')
  const [error, setError] = useState('')
  const [flaggedComments, setFlaggedComments] = useState<Record<string, 'reported' | 'already'>>({})

  useEffect(() => {
    if (!currentAccountId) return
    async function load() {
      try {
        const [personaRes, meRes] = await Promise.all([
          fetch('/api/personas/mine'),
          fetch('/api/auth/me'),
        ])
        if (personaRes.ok) {
          const data = await personaRes.json()
          setPersonas(data)
          if (data.length > 0) setSelectedPersonaId(data[0].id)
        }
        if (meRes.ok) {
          const data = await meRes.json()
          setCommentsRemaining(data.comments_remaining)
        }
      } catch {}
    }
    load()
  }, [currentAccountId])

  const selectedPersonaName = personas.find(p => p.id === selectedPersonaId)?.name || 'persona'

  async function handleGenerate() {
    if (!inputText.trim() || !selectedPersonaId) return
    setError('')
    setPhase('generating')

    try {
      const res = await fetch('/api/comments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          input_text: inputText,
          persona_id: selectedPersonaId,
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setError('No comments remaining today.')
        setPhase('input')
        return
      }

      if (!res.ok) {
        setError(data.message || data.error || 'Generation failed')
        setPhase('input')
        return
      }

      setGeneratedComment(data.generated_comment)
      setGenerationId(data.generation_id)
      // Slot is now consumed regardless of post/cancel
      if (commentsRemaining !== null && commentsRemaining > 0) {
        setCommentsRemaining(commentsRemaining - 1)
      }
      setPhase('confirm')
    } catch {
      setError('Something went wrong.')
      setPhase('input')
    }
  }

  async function handlePost() {
    setError('')

    try {
      const res = await fetch('/api/comments/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generation_id: generationId,
          article_id: articleId,
          persona_id: selectedPersonaId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || data.error || 'Failed to post')
        return
      }

      const newComment: Comment = {
        id: (await res.json()).commentId || crypto.randomUUID(),
        body: generatedComment,
        posted_at: new Date().toISOString(),
        persona_name: selectedPersonaName,
      }
      setComments(prev => [...prev, newComment])
      onCommentPosted(newComment)
      setInputText('')
      setGeneratedComment('')
      setGenerationId('')
      setPhase('input')
    } catch {
      setError('Something went wrong.')
    }
  }

  function handleCancel() {
    // Slot is already consumed — this is by design (GDD Mechanic 4)
    setGeneratedComment('')
    setGenerationId('')
    setPhase('input')
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="article-comments-section">
      <h3 className="article-comments-heading">Comments</h3>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="article-comments-empty">No comments yet.</p>
      ) : (
        <div className="article-comments-list">
          {comments.map(c => (
            <div key={c.id} className="article-comment">
              <div className="article-comment-header">
                <span className="article-comment-persona">{c.persona_name}</span>
                <span className="article-comment-time">{formatTime(c.posted_at)}</span>
              </div>
              <p className="article-comment-body">{c.body}</p>
              {currentAccountId && (
                <div style={{ marginTop: '4px' }}>
                  {flaggedComments[c.id] ? (
                    <span className="text-[12px]" style={{ color: 'var(--bb-6)' }}>
                      {flaggedComments[c.id] === 'reported' ? 'Reported' : 'Already reported'}
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/flags', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content_type: 'comment', content_id: c.id }),
                          })
                          if (res.status === 201) setFlaggedComments(prev => ({ ...prev, [c.id]: 'reported' }))
                          else if (res.status === 409) setFlaggedComments(prev => ({ ...prev, [c.id]: 'already' }))
                        } catch {}
                      }}
                      className="text-[12px]"
                      style={{ color: 'var(--bb-6)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Flag
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comment input — logged in only */}
      {!currentAccountId ? (
        <p className="article-comments-login">
          <Link href={`/login?redirect=/article/${articleId}`} className="underline">Sign in</Link> to comment.
        </p>
      ) : personas.length === 0 ? (
        <p className="article-comments-login">
          <Link href="/dashboard/persona/new" className="underline">Create a persona</Link> to comment.
        </p>
      ) : (
        <div className="article-comment-form">
          {commentsRemaining !== null && (
            <p className="article-comments-remaining">
              {commentsRemaining} comment{commentsRemaining !== 1 ? 's' : ''} remaining today
            </p>
          )}

          {phase === 'generating' && (
            <p className="seed-generating-text" style={{ fontSize: '15px', padding: '1rem 0' }}>
              Your instrument is composing…
            </p>
          )}

          {phase === 'confirm' && (
            <div className="article-comment-preview">
              <p className="article-comment-preview-label">Generated comment:</p>
              <p className="article-comment-preview-text">{generatedComment}</p>
              <p className="article-comment-cancel-note">
                Cancelled comments count toward your daily limit.
              </p>
              <div className="flex gap-3 mt-3">
                <button onClick={handlePost} className="auth-button" style={{ flex: 1 }}>
                  Post
                </button>
                <button onClick={handleCancel} className="seed-regen-button" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phase === 'input' && (
            <>
              {personas.length > 1 && (
                <select
                  value={selectedPersonaId}
                  onChange={(e) => setSelectedPersonaId(e.target.value)}
                  className="auth-input mb-2"
                  style={{ fontSize: '13px' }}
                >
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={500}
                rows={3}
                className="seed-textarea"
                placeholder="Direct your persona's response…"
              />
              <button
                onClick={handleGenerate}
                disabled={!inputText.trim() || commentsRemaining === 0}
                className="auth-button mt-2"
              >
                Comment as {selectedPersonaName}
              </button>
            </>
          )}

          {error && <p className="auth-error mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}
