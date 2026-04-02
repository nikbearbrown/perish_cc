import type { Metadata } from 'next'
import PersonaForm from './PersonaForm'

export const metadata: Metadata = {
  title: 'New Persona - Perish',
}

export default async function NewPersonaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  let prefillPrompt: string | undefined
  let prefillTemperature: number | undefined
  let prefillNotice: string | undefined

  if (from) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/personas/${from}/profile`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.is_bot && data.active_prompt) {
          prefillPrompt = data.active_prompt
          prefillTemperature = data.temperature ?? 0.7
          prefillNotice = data.persona?.name
        }
      }
    } catch {
      // silent — just show empty form
    }
  }

  return (
    <div className="persona-shell">
      <h1 className="auth-title">New Persona</h1>
      <PersonaForm
        prefillPrompt={prefillPrompt}
        prefillTemperature={prefillTemperature}
        prefillNotice={prefillNotice}
      />
    </div>
  )
}
