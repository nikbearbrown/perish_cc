import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Dashboard - Perish',
}

export default function DashboardPage() {
  redirect('/dashboard/seed')
}
