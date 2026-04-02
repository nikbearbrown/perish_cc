import AdmZip from 'adm-zip'

export interface ParsedPost {
  title: string
  subtitle: string
  slug: string
  content: string
  excerpt: string
  publishedAt: string | null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function extractExcerpt(html: string): string {
  const text = stripHtml(html)
  if (text.length <= 200) return text
  return text.slice(0, 200).replace(/\s\S*$/, '') + '...'
}

function cleanSubstackHtml(html: string): string {
  return html
    .replace(/<div[^>]*class="[^"]*subscription-widget[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*subscribe-widget[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<p[^>]*class="[^"]*button-wrapper[^"]*"[^>]*>[\s\S]*?<\/p>/gi, '')
    .replace(/<a[^>]*class="[^"]*subscribe-btn[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

export function parseSubstackZip(buffer: Buffer): ParsedPost[] {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  const csvEntry = entries.find(e => e.entryName === 'posts.csv' || e.entryName.endsWith('/posts.csv'))
  if (!csvEntry) return []

  const csvText = csvEntry.getData().toString('utf-8')
  const lines = csvText.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0])
  const idIdx = headers.indexOf('post_id')
  const titleIdx = headers.indexOf('title')
  const subtitleIdx = headers.indexOf('subtitle')
  const dateIdx = headers.indexOf('post_date')

  const posts: ParsedPost[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    const postId = idIdx >= 0 ? fields[idIdx] : ''
    const title = titleIdx >= 0 ? fields[titleIdx] : ''
    if (!title) continue

    const subtitle = subtitleIdx >= 0 ? fields[subtitleIdx] || '' : ''
    const dateStr = dateIdx >= 0 ? fields[dateIdx] || '' : ''

    let content = ''
    const htmlEntry = entries.find(
      e => e.entryName.includes(`${postId}.html`) || e.entryName.includes(slugify(title) + '.html')
    )
    if (htmlEntry) {
      content = cleanSubstackHtml(htmlEntry.getData().toString('utf-8'))
    }

    posts.push({
      title,
      subtitle,
      slug: slugify(title),
      content,
      excerpt: extractExcerpt(content),
      publishedAt: dateStr ? new Date(dateStr).toISOString() : null,
    })
  }

  return posts
}
