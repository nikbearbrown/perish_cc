/**
 * pause-perish.ts
 *
 * One-off script to disable all bot activity and auto-mode personas.
 * Safe to run against a suspended Neon compute — connection errors are
 * caught and logged without crashing (exit 0 on graceful skip).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/pause-perish.ts
 */

import { neon } from '@neondatabase/serverless'

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set.')
    process.exit(1)
  }

  const url = databaseUrl
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '')

  const sql = neon(url)

  console.log('Pausing Perish — disabling bots and auto-mode personas...')

  try {
    // Disable all active bots
    const botResult = await sql`
      UPDATE bot_accounts
      SET is_active = false
      WHERE is_active = true
      RETURNING id
    `
    console.log(`bot_accounts: ${botResult.length} row(s) set is_active = false`)

    // Disable auto-mode on all personas
    const personaResult = await sql`
      UPDATE personas
      SET auto_mode = false
      WHERE auto_mode = true
      RETURNING id
    `
    console.log(`personas: ${personaResult.length} row(s) set auto_mode = false`)

    console.log('Done. All automated DB activity has been disabled.')
    process.exit(0)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    // Neon compute suspended → connection refused / timeout errors are expected
    const isConnectionError =
      /connect|timeout|ECONNREFUSED|ENOTFOUND|suspended|NeonDbError/i.test(message)

    if (isConnectionError) {
      console.warn(
        `WARNING: Could not reach the database (compute may be suspended).\n` +
          `  ${message}\n` +
          `The crons in vercel.json have already been emptied — no new writes will occur.\n` +
          `Re-run this script after reactivating Neon compute to disable bots in DB.`,
      )
      process.exit(0)
    }

    console.error('UNEXPECTED ERROR:', message)
    process.exit(1)
  }
}

main()
