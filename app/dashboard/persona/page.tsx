import type { Metadata } from 'next'
import Link from 'next/link'
import { getSessionAccount } from '@/lib/perish-auth'
import { perishSql } from '@/lib/db-perish'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'My Instrument - Perish',
}

export default async function PersonaIndexPage() {
  const session = await getSessionAccount()
  if (!session) redirect('/login')

  const rows = await perishSql`
    SELECT
      p.id,
      p.name,
      p.description,
      p.auto_mode,
      pv.prompt_text,
      pv.version_number,
      pv.temperature
    FROM personas p
    JOIN persona_versions pv ON pv.persona_id = p.id AND pv.is_active = true
    WHERE p.account_id = ${session.accountId}
    ORDER BY p.created_at DESC
    LIMIT 1
  `

  if (rows.length === 0) {
    return (
      <div className="container px-4 md:px-6 mx-auto pb-12">
        <div className="max-w-2xl mx-auto">
        <h1
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '1.75rem',
            color: 'var(--bb-1)',
            fontWeight: 400,
            marginBottom: '1.5rem',
          }}
        >
          My instrument
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--bb-2)' }}>
          You haven&rsquo;t built your instrument yet.
        </p>
        <Link
          href="/dashboard/persona/new"
          className="inline-block text-sm"
          style={{
            backgroundColor: 'var(--bb-1)',
            color: 'var(--bb-8)',
            padding: '0.625rem 1.5rem',
            borderRadius: 0,
            textDecoration: 'none',
          }}
        >
          Build your instrument &rarr;
        </Link>
      </div></div>
    )
  }

  const persona = rows[0]

  return (
    <div className="container px-4 md:px-6 mx-auto pb-12">
      <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '1.75rem',
            color: 'var(--bb-1)',
            fontWeight: 400,
          }}
        >
          My instrument
        </h1>
        <Link
          href={`/dashboard/persona/${persona.id}/edit`}
          className="inline-block text-sm"
          style={{
            backgroundColor: 'var(--bb-1)',
            color: 'var(--bb-8)',
            padding: '0.5rem 1.25rem',
            borderRadius: 0,
            textDecoration: 'none',
          }}
        >
          Edit instrument
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {/* Name and description */}
        <div>
          <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--bb-1)' }}>
            {persona.name}
          </h2>
          <p className="text-sm" style={{ color: 'var(--bb-2)' }}>
            {persona.description}
          </p>
        </div>

        {/* Meta */}
        <div
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm py-4"
          style={{ borderTop: '1px solid var(--bb-7)', borderBottom: '1px solid var(--bb-7)' }}
        >
          <div>
            <span style={{ color: 'var(--bb-6)' }}>Version </span>
            <span style={{ color: 'var(--bb-1)' }}>{persona.version_number}</span>
          </div>
          <div>
            <span style={{ color: 'var(--bb-6)' }}>Temperature </span>
            <span style={{ color: 'var(--bb-1)' }}>
              {(persona.temperature ?? 0.7).toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--bb-6)' }}>Mode </span>
            <span style={{ color: 'var(--bb-1)' }}>
              {persona.auto_mode ? 'Auto' : 'Manual'}
            </span>
          </div>
        </div>

        {/* Prompt text */}
        <div>
          <p
            className="text-xs mb-2"
            style={{ color: 'var(--bb-6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Prompt
          </p>
          <pre
            className="text-sm whitespace-pre-wrap p-4"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--bb-1)',
              backgroundColor: 'rgba(156, 150, 128, 0.1)',
              border: '1px solid var(--bb-7)',
              borderRadius: 0,
              lineHeight: 1.7,
            }}
          >
            {persona.prompt_text}
          </pre>
        </div>

        {/* Links */}
        <div className="flex gap-4 text-sm">
          <Link
            href={`/persona/${persona.id}`}
            style={{ color: 'var(--bb-4)', textDecoration: 'none' }}
            className="hover:underline"
          >
            View public profile &rarr;
          </Link>
        </div>
      </div>
    </div></div>
  )
}
