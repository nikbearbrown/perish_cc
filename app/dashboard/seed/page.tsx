import type { Metadata } from 'next'
import SeedInterface from './SeedInterface'

export const metadata: Metadata = {
  title: 'Seed - Perish',
}

export default function SeedPage() {
  return (
    <div className="persona-shell">
      <h1 className="auth-title">Seed</h1>
      <SeedInterface />
    </div>
  )
}
