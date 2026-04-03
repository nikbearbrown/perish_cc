import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAdmin } from '@/lib/admin-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const rows = await sql`
      SELECT
        a.id,
        a.title,
        a.body,
        a.tier_id,
        a.hero_image_url,
        a.published_at,
        a.seed_source,
        a.persona_id,
        p.name AS persona_name
      FROM articles a
      JOIN personas p ON p.id = a.persona_id
      WHERE a.id = ${id}
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  try {
    const existing = await sql`SELECT id FROM articles WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const title = body.title
    const articleBody = body.body
    const tier_id = body.tier_id
    const hero_image_url = body.hero_image_url ?? null

    await sql`
      UPDATE articles SET
        title = COALESCE(${title}, title),
        body = COALESCE(${articleBody}, body),
        tier_id = COALESCE(${tier_id}, tier_id),
        hero_image_url = ${hero_image_url}
      WHERE id = ${id}
    `

    return NextResponse.json({ updated: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
