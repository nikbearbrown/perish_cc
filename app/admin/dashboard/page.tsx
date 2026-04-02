import Link from 'next/link'

const PLAYER_LINKS = [
  { name: 'Seed today\u2019s article', href: '/dashboard/seed' },
  { name: 'My instrument', href: '/dashboard/persona' },
  { name: 'View the feed', href: '/feed' },
  { name: 'Leaderboard', href: '/leaderboard' },
]

const ADMIN_LINKS = [
  { name: 'Blog posts', href: '/admin/dashboard/blog' },
  { name: 'Flags queue', href: '/admin/dashboard/flags' },
]

const EXTERNAL_LINKS = [
  { section: 'NEON', name: 'Database console', href: 'https://console.neon.tech' },
  { section: 'VERCEL', name: 'Deployments', href: 'https://vercel.com/dashboard' },
]

export default function AdminDashboardPage() {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-8">
        <div>
          <p
            className="text-xs mb-3"
            style={{ color: 'var(--bb-6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Player side
          </p>
          <div className="flex flex-col gap-2">
            {PLAYER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm hover:underline"
                style={{ color: 'var(--bb-1)' }}
              >
                &rarr; {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p
            className="text-xs mb-3"
            style={{ color: 'var(--bb-6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Admin tools
          </p>
          <div className="flex flex-col gap-2">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm hover:underline"
                style={{ color: 'var(--bb-1)' }}
              >
                &rarr; {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {EXTERNAL_LINKS.map((link) => (
          <div key={link.href}>
            <p
              className="text-xs mb-3"
              style={{ color: 'var(--bb-6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              {link.section}
            </p>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: 'var(--bb-1)' }}
            >
              &rarr; {link.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
