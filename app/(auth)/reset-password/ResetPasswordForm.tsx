'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  if (token) {
    return <ConfirmReset token={token} />
  }
  return <RequestReset />
}

function RequestReset() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email }),
      })

      if (res.ok) {
        setSent(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full flex flex-col gap-4 text-center">
        <p className="text-[15px]" style={{ color: 'var(--bb-1)' }}>
          Check your inbox for a reset link.
        </p>
        <p className="text-[14px]" style={{ color: 'var(--bb-1)' }}>
          <Link href="/login" className="underline hover:opacity-70">Back to sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="auth-label">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" disabled={submitting} className="auth-button">
        {submitting ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="text-center text-[14px]" style={{ color: 'var(--bb-1)' }}>
        <Link href="/login" className="underline hover:opacity-70">Back to sign in</Link>
      </p>
    </form>
  )
}

function ConfirmReset({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', token, new_password: newPassword }),
      })

      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        if (data.error === 'token_expired') {
          setError('This reset link has expired. Please request a new one.')
        } else if (data.error === 'token_already_used') {
          setError('This reset link has already been used.')
        } else if (data.error === 'password_too_short') {
          setError('Password must be at least 8 characters.')
        } else {
          setError('Invalid or expired reset link.')
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="w-full flex flex-col gap-4 text-center">
        <p className="text-[15px]" style={{ color: 'var(--bb-1)' }}>
          Password updated —{' '}
          <Link href="/login" className="underline hover:opacity-70">sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new_password" className="auth-label">New password</label>
        <input
          id="new_password"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="auth-input"
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" disabled={submitting} className="auth-button">
        {submitting ? 'Updating…' : 'Reset password'}
      </button>
    </form>
  )
}
