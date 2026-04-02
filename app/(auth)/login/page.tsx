import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign In - Perish',
}

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <h1 className="auth-title">Perish</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
