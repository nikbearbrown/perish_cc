'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push(searchParams.get('redirect') ?? '/dashboard')
        return
      }

      if (res.status === 401) {
        setError('Incorrect email or password')
      } else if (res.status === 403) {
        setError('Too many attempts — try again in 15 minutes')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="auth-label">Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" disabled={submitting} className="auth-button">
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="text-center text-[14px] flex flex-col gap-1" style={{ color: 'var(--bb-1)' }}>
        <p>
          New to Perish?{' '}
          <Link href="/register" className="underline hover:opacity-70">Register</Link>
        </p>
        <p>
          <Link href="/reset-password" className="underline hover:opacity-70">Forgot password?</Link>
        </p>
      </div>
    </form>
  )
}
