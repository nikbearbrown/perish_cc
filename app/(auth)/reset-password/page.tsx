import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password - Perish',
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-shell">
      <h1 className="auth-title">Perish</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
