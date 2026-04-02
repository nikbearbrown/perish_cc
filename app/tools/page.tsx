import { join } from 'path'
import { readFileSync } from 'fs'
import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import { scanHtmlDir } from '@/lib/html-meta'
import ToolsBrowser from './ToolsBrowser'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tools - Perish',
  description: 'Tools directory curated by Irreducibly Human.',
}

interface Tool {
  id: string
  name: string
  slug: string
  description: string
  tool_type: 'link' | 'artifact'
  claude_url: string | null
  tags: string[]
}

export default async function ToolsPage() {
  const artifactDocs = scanHtmlDir(join(process.cwd(), 'public', 'artifacts'))
  const artifactTools: Tool[] = artifactDocs.map(doc => ({
    id: `fs-${doc.slug}`,
    name: doc.title,
    slug: doc.slug,
    description: doc.description,
    tool_type: 'artifact',
    claude_url: `/artifacts/${doc.filename}`,
    tags: doc.tags,
  }))

  let dbTools: Tool[] = []
  try {
    dbTools = await sql`SELECT * FROM tools WHERE tool_type = 'link' ORDER BY created_at DESC`
  } catch (err) {
    console.error('[tools/page] Failed to fetch DB tools:', err)
  }

  const slugSet = new Set(artifactTools.map(t => t.slug))
  const linkTools = dbTools.filter(t => !slugSet.has(t.slug))
  const allTools = [...artifactTools, ...linkTools]

  let filterTags: string[] = []
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'artifacts', 'filters.json'), 'utf-8')
    filterTags = JSON.parse(raw)
  } catch {}

  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tighter mb-4">Tools</h1>
        <p className="text-muted-foreground mb-8">A curated directory of AI tools for educators, students, and professionals.</p>
        <ToolsBrowser tools={allTools} filterTags={filterTags} />
      </div>
    </div>
  )
}
