'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SettingsContent() {
  const searchParams = useSearchParams()
  const substackParam = searchParams.get('substack')

  const [connection, setConnection] = useState<{
    publication_name: string
    substack_url: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (substackParam === 'connected') {
      setMessage('Substack connected successfully.')
    } else if (substackParam === 'error') {
      setMessage('Failed to connect Substack. Please try again.')
    }
  }, [substackParam])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/substack/status')
        if (res.ok) {
          const data = await res.json()
          if (data.connected) {
            setConnection({
              publication_name: data.publication_name,
              substack_url: data.substack_url,
            })
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/substack/connect', { method: 'DELETE' })
      if (res.ok) {
        setConnection(null)
        setMessage('Substack disconnected.')
      }
    } catch {}
    setDisconnecting(false)
  }

  if (loading) {
    return <p style={{ color: 'var(--bb-6)' }}>Loading…</p>
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h2 className="auth-label" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.75rem' }}>
          Substack
        </h2>

        {message && (
          <p className="text-[14px] mb-4" style={{ color: 'var(--bb-4)' }}>{message}</p>
        )}

        {connection ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[15px]" style={{ color: 'var(--bb-1)' }}>
                Connected to <strong>{connection.publication_name}</strong>
              </p>
              {connection.substack_url && (
                <a
                  href={connection.substack_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px]"
                  style={{ color: 'var(--bb-4)', textDecoration: 'underline' }}
                >
                  {connection.substack_url}
                </a>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="seed-regen-button"
              style={{ width: 'fit-content' }}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[14px]" style={{ color: 'var(--bb-6)' }}>
              Not connected. Connect your Substack to auto-export published articles.
            </p>
            <a href="/api/substack/connect" className="auth-button" style={{ width: 'fit-content', textAlign: 'center', textDecoration: 'none', display: 'inline-block', padding: '0.6rem 1.5rem' }}>
              Connect Substack
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="persona-shell" style={{ maxWidth: '520px' }}>
      <h1 className="auth-title">Settings</h1>
      <Suspense>
        <SettingsContent />
      </Suspense>
    </div>
  )
}
