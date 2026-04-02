'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [emailError, setEmailError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setGeneralError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName || undefined,
        }),
      })

      if (res.status === 201) {
        router.push('/dashboard')
        return
      }

      const data = await res.json()
      if (res.status === 409) {
        setEmailError('This email is already registered')
      } else {
        setGeneralError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setGeneralError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
        {emailError && <p className="auth-error">{emailError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="auth-label">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
        <p className="text-[13px]" style={{ color: 'var(--bb-6)' }}>Minimum 8 characters</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="display_name" className="auth-label">Display name (optional)</label>
        <input
          id="display_name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="auth-input"
        />
      </div>

      {generalError && <p className="auth-error">{generalError}</p>}

      <button type="submit" disabled={submitting} className="auth-button">
        {submitting ? 'Creating account…' : 'Register'}
      </button>

      <p className="text-center text-[14px]" style={{ color: 'var(--bb-1)' }}>
        Already have an account?{' '}
        <Link href="/login" className="underline hover:opacity-70">Sign in</Link>
      </p>
    </form>
  )
}
