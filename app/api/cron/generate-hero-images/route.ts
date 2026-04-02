import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { generateHeroImage, attachHeroImage } from '@/lib/image-gen'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rows = await perishSql`
    SELECT a.id, pv.prompt_text, a.title
    FROM articles a
    LEFT JOIN persona_versions pv ON a.persona_version_id = pv.id
    WHERE a.hero_image_url IS NULL
      AND a.published_at >= NOW() - INTERVAL '2 hours'
    LIMIT 10
  `

  let generated = 0
  let skipped = 0

  for (const row of rows) {
    const imageUrl = await generateHeroImage(row.id, row.prompt_text || '', row.title)
    if (imageUrl) {
      await attachHeroImage(row.id, imageUrl)
      generated++
    } else {
      skipped++
    }
  }

  console.log(JSON.stringify({
    cron: 'generate-hero-images',
    candidates: rows.length,
    generated,
    skipped,
    run_at: new Date().toISOString(),
  }))

  return NextResponse.json({ candidates: rows.length, generated, skipped })
}
