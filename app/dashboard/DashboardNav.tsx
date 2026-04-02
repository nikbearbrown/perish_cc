'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { name: 'Seed today', href: '/dashboard/seed' },
  { name: 'My instrument', href: '/dashboard/persona' },
  { name: 'Settings', href: '/dashboard/settings' },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex gap-6 mb-8 pb-4"
      style={{ borderBottom: '1px solid var(--bb-7)' }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === '/dashboard/persona' && pathname.startsWith('/dashboard/persona'))

        return (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm transition-colors"
            style={{
              color: isActive ? 'var(--bb-1)' : 'var(--bb-6)',
              fontWeight: isActive ? 500 : 400,
              textDecoration: 'none',
            }}
          >
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
