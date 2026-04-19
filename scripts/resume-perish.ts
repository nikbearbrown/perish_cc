/**
 * resume-perish.ts
 *
 * One-off script to re-enable Perish after a review pause.
 *
 * What it does:
 *   1. Restores the crons array in vercel.json from vercel.json.paused-crons.backup
 *   2. Sets all bot_accounts rows back to is_active = true
 *   3. Leaves personas.auto_mode alone (player choice — not forced back on)
 *
 * After running this script you MUST commit and push vercel.json to main
 * so Vercel picks up the restored cron schedule on the next deploy.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/resume-perish.ts
 */

import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'

const VERCEL_JSON = path.resolve(__dirname, '..', 'vercel.json')
const BACKUP_FILE = path.resolve(__dirname, '..', 'vercel.json.paused-crons.backup')

function restoreCrons(): void {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`ERROR: Backup file not found: ${BACKUP_FILE}`)
    console.error('Cannot restore crons. Aborting.')
    process.exit(1)
  }

  const backupCrons = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'))
  const vercelConfig = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf-8'))

  vercelConfig.crons = backupCrons
  fs.writeFileSync(VERCEL_JSON, JSON.stringify(vercelConfig, null, 2) + '\n', 'utf-8')

  console.log(`vercel.json: crons restored (${backupCrons.length} entries):`)
  for (const entry of backupCrons) {
    console.log(`  ${entry.schedule.padEnd(16)} ${entry.path}`)
  }
  console.log()
  console.log(
    '*** ACTION REQUIRED: commit vercel.json and push to main so Vercel activates the cron schedule. ***',
  )
  console.log()
}

async function main(): Promise<void> {
  // Step 1 — restore vercel.json crons (no DB needed)
  restoreCrons()

  // Step 2 — re-enable bots in DB
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set. Cannot update database.')
    process.exit(1)
  }

  const url = databaseUrl
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '')

  const sql = neon(url)

  console.log('Resuming Perish — re-enabling bot accounts...')

  try {
    const botResult = await sql`
      UPDATE bot_accounts
      SET is_active = true
      WHERE is_active = false
      RETURNING id
    `
    console.log(`bot_accounts: ${botResult.length} row(s) set is_active = true`)

    console.log()
    console.log(
      'Note: personas.auto_mode has NOT been touched — players control their own auto-mode setting.',
    )
    console.log('Done.')
    process.exit(0)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('ERROR updating database:', message)
    console.error('vercel.json has been restored on disk — commit and push when DB is accessible.')
    process.exit(1)
  }
}

main()
