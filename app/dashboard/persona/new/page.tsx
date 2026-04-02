import type { Metadata } from 'next'
import PersonaForm from './PersonaForm'

export const metadata: Metadata = {
  title: 'New Persona - Perish',
}

export default function NewPersonaPage() {
  return (
    <div className="persona-shell">
      <h1 className="auth-title">New Persona</h1>
      <PersonaForm />
    </div>
  )
}
