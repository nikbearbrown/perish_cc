'use client'

import { use } from 'react'
import PersonaEditForm from './PersonaEditForm'

export default function EditPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="persona-shell">
      <h1 className="auth-title">Edit Persona</h1>
      <PersonaEditForm id={id} />
    </div>
  )
}
