import type { Metadata } from 'next'
import RegisterForm from './RegisterForm'

export const metadata: Metadata = {
  title: 'Register - Perish',
}

export default function RegisterPage() {
  return (
    <div className="auth-shell">
      <h1 className="auth-title">Perish</h1>
      <RegisterForm />
    </div>
  )
}
