import { perishSql } from '@/lib/db-perish'

export interface SubstackConnection {
  id: string
  account_id: string
  access_token: string
  publication_id: string
  publication_name: string
  substack_url: string
}

export interface SubstackExportPayload {
  article_id: string
  title: string
  body: string
  persona_name: string
  persona_description: string
  perish_article_url: string
  tier_id: number
  tier_name: string
  connection: SubstackConnection
}

export function buildBylineFootnote(payload: SubstackExportPayload): string {
  return `*Written by ${payload.persona_name} — ${payload.persona_description}. ${payload.connection.substack_url}. Published on ${payload.perish_article_url} · Tier ${payload.tier_id}: ${payload.tier_name}.*`
}

export async function exportArticle(
  payload: SubstackExportPayload,
): Promise<{ success: boolean; error?: string }> {
  const bodyWithByline = payload.body + '\n\n' + buildBylineFootnote(payload)

  try {
    // Placeholder endpoint — real Substack API endpoint TBD during T-018
    const res = await fetch('https://substack.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${payload.connection.access_token}`,
      },
      body: JSON.stringify({
        publication_id: payload.connection.publication_id,
        title: payload.title,
        body: bodyWithByline,
        type: 'newsletter',
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.error?.message || `Substack API returned ${res.status}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function queueExport(articleId: string): Promise<void> {
  await perishSql`
    INSERT INTO substack_export_queue (article_id)
    VALUES (${articleId})
    ON CONFLICT (article_id) DO NOTHING
  `
}

export async function processExportQueue(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const pending = await perishSql`
    SELECT id, article_id FROM substack_export_queue
    WHERE status = 'pending' AND next_retry_at <= NOW() AND attempts < 3
    ORDER BY created_at ASC
  `

  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const item of pending) {
    processed++

    // Fetch article + persona + tier + connection
    const rows = await perishSql`
      SELECT
        a.id AS article_id,
        a.title,
        a.body,
        a.account_id,
        a.tier_id,
        p.name AS persona_name,
        p.description AS persona_description,
        t.name AS tier_name,
        sc.id AS connection_id,
        sc.access_token,
        sc.publication_id,
        sc.publication_name,
        sc.substack_url
      FROM articles a
      JOIN personas p ON p.id = a.persona_id
      JOIN tiers t ON t.id = a.tier_id
      LEFT JOIN substack_connections sc ON sc.account_id = a.account_id
      WHERE a.id = ${item.article_id}
    `

    if (rows.length === 0) {
      await perishSql`
        UPDATE substack_export_queue
        SET status = 'failed', last_error = 'article not found', updated_at = NOW()
        WHERE id = ${item.id}
      `
      failed++
      continue
    }

    const row = rows[0]

    if (!row.connection_id) {
      await perishSql`
        UPDATE substack_export_queue
        SET status = 'failed', last_error = 'no substack connection', updated_at = NOW()
        WHERE id = ${item.id}
      `
      await perishSql`
        UPDATE articles SET substack_export_status = 'not_connected'
        WHERE id = ${item.article_id}
      `
      failed++
      continue
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://perish.cc'
    const payload: SubstackExportPayload = {
      article_id: row.article_id,
      title: row.title,
      body: row.body,
      persona_name: row.persona_name,
      persona_description: row.persona_description,
      perish_article_url: `${siteUrl}/article/${row.article_id}`,
      tier_id: row.tier_id,
      tier_name: row.tier_name,
      connection: {
        id: row.connection_id,
        account_id: row.account_id,
        access_token: row.access_token,
        publication_id: row.publication_id,
        publication_name: row.publication_name,
        substack_url: row.substack_url,
      },
    }

    const result = await exportArticle(payload)

    if (result.success) {
      await perishSql`
        UPDATE substack_export_queue
        SET status = 'success', updated_at = NOW()
        WHERE id = ${item.id}
      `
      await perishSql`
        UPDATE articles SET substack_export_status = 'exported'
        WHERE id = ${item.article_id}
      `
      succeeded++
    } else {
      const newAttempts = (await perishSql`
        UPDATE substack_export_queue
        SET
          attempts = attempts + 1,
          last_error = ${result.error || 'unknown error'},
          next_retry_at = NOW() + (INTERVAL '5 minutes' * POWER(2, attempts + 1)),
          status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END,
          updated_at = NOW()
        WHERE id = ${item.id}
        RETURNING attempts
      `)[0]?.attempts ?? 0

      if (newAttempts >= 3) {
        await perishSql`
          UPDATE articles SET substack_export_status = 'failed'
          WHERE id = ${item.article_id}
        `
      }
      failed++
    }
  }

  return { processed, succeeded, failed }
}
