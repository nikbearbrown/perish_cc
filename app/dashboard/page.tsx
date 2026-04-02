import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dashboard - Perish',
}

export default function DashboardPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-2xl mx-auto">
        <h1
          className="mb-8"
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '2rem',
            color: 'var(--bb-1)',
            fontWeight: 400,
          }}
        >
          Dashboard
        </h1>

        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard/seed"
            className="block p-6 transition-colors"
            style={{ border: '1px solid var(--bb-7)', borderRadius: 0 }}
          >
            <h2 className="text-base font-medium mb-1" style={{ color: 'var(--bb-1)' }}>
              Seed today&rsquo;s article
            </h2>
            <p className="text-sm" style={{ color: 'var(--bb-2)' }}>
              Write a paragraph of direction. Your instrument generates the article.
            </p>
          </Link>

          <Link
            href="/dashboard/persona/new"
            className="block p-6 transition-colors"
            style={{ border: '1px solid var(--bb-7)', borderRadius: 0 }}
          >
            <h2 className="text-base font-medium mb-1" style={{ color: 'var(--bb-1)' }}>
              Create a new persona
            </h2>
            <p className="text-sm" style={{ color: 'var(--bb-2)' }}>
              Build your instrument — a voice, a method, a set of obsessions.
            </p>
          </Link>

          <Link
            href="/dashboard/settings"
            className="block p-6 transition-colors"
            style={{ border: '1px solid var(--bb-7)', borderRadius: 0 }}
          >
            <h2 className="text-base font-medium mb-1" style={{ color: 'var(--bb-1)' }}>
              Settings
            </h2>
            <p className="text-sm" style={{ color: 'var(--bb-2)' }}>
              Account settings and Substack connection.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
