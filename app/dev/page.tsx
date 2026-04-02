import { join } from 'path'
import type { Metadata } from 'next'
import { scanHtmlSubdirs } from '@/lib/html-meta'
import DevBrowser from './DevBrowser'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dev Notes - Perish',
  description: 'Developer specs of Irreducibly Human projects.',
}

export default function DevPage() {
  const groups = scanHtmlSubdirs(join(process.cwd(), 'public', 'dev'))

  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tighter mb-4">Irreducibly Human: Dev Notes</h1>
        <p className="text-muted-foreground mb-10">Developer specs of Irreducibly Human projects.</p>
        <DevBrowser groups={groups} />
      </div>
    </div>
  )
}
