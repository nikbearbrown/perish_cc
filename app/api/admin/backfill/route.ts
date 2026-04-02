import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import { isAdmin } from '@/lib/admin-auth'
import { getActiveBots, generateBotArticle } from '@/lib/bot-engine'
import { hashPassword } from '@/lib/perish-auth'

const BACKFILL_DAYS = 21
const SYSTEM_VOTER_COUNT = 15 // Max votes per article; each needs a unique voter account

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim() || ''
  if (firstLine.startsWith('#')) {
    const title = firstLine.replace(/^#+\s*/, '').trim()
    if (title) return title
  }
  if (firstLine.length > 0 && firstLine.length <= 100) return firstLine
  return text.slice(0, 80).replace(/\s\S*$/, '') || 'Untitled'
}

async function getOrCreateSystemVoters(): Promise<string[]> {
  const ids: string[] = []
  for (let i = 0; i < SYSTEM_VOTER_COUNT; i++) {
    const email = `system-voter-${i}@perish.cc`
    const existing = await perishSql`SELECT id FROM accounts WHERE email = ${email}`
    if (existing.length > 0) {
      ids.push(existing[0].id)
    } else {
      const passwordHash = await hashPassword('system-account-not-for-login')
      const rows = await perishSql`
        INSERT INTO accounts (email, password_hash, display_name)
        VALUES (${email}, ${passwordHash}, ${`System Voter ${i}`})
        RETURNING id
      `
      ids.push(rows[0].id)
    }
  }
  return ids
}

function pickPrimaryTier(tierWeights: Record<string, number>): number {
  let maxWeight = -1
  let maxTier = 1
  for (const [tier, weight] of Object.entries(tierWeights)) {
    if (weight > maxWeight) {
      maxWeight = weight
      maxTier = parseInt(tier, 10)
    }
  }
  return maxTier
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Idempotency guard: cannot run twice
  const backdatedCheck = await perishSql`
    SELECT id FROM articles WHERE is_backdated = true LIMIT 1
  `
  if (backdatedCheck.length > 0) {
    return NextResponse.json({ error: 'already_run', message: 'Backdated content already exists. This job is one-time only.' }, { status: 409 })
  }

  // Return 202 immediately — run the backfill async
  // NOTE: In Vercel serverless, this still blocks until completion or timeout.
  // At small scale (< 10 bots × 21 days), this should complete within the
  // 60-second function timeout. For larger bot pools, use Vercel Background Functions.
  const promise = runBackfill()

  // Fire and forget — we can't truly detach in standard serverless,
  // but we return early. If the function times out, partial results persist
  // because each article is committed individually.
  promise.catch(err => console.error('[backfill] Uncaught error:', err))

  return NextResponse.json(
    { status: 'started', message: 'Backfill job started. Check server logs for progress.' },
    { status: 202 },
  )
}

async function runBackfill() {
  const bots = await getActiveBots()
  const systemVoterIds = await getOrCreateSystemVoters()

  let totalArticles = 0
  let totalVotes = 0

  for (let botIndex = 0; botIndex < bots.length; botIndex++) {
    const bot = bots[botIndex]
    const tierId = pickPrimaryTier(bot.tier_weights)

    for (let dayOffset = BACKFILL_DAYS; dayOffset >= 1; dayOffset--) {
      // Historical date: today minus dayOffset, at 8am UTC + stagger per bot
      const publishDate = new Date()
      publishDate.setUTCDate(publishDate.getUTCDate() - dayOffset)
      publishDate.setUTCHours(8, botIndex * 23 % 60, 0, 0)

      try {
        const generatedText = await generateBotArticle(bot)
        if (!generatedText) {
          console.log(JSON.stringify({ backfill: true, bot_name: bot.name, day: dayOffset, status: 'generation_failed' }))
          continue
        }

        const title = extractTitle(generatedText)

        const articleRows = await perishSql`
          INSERT INTO articles (account_id, persona_id, persona_version_id, title, body, tier_id, published_at, is_backdated)
          VALUES (
            ${bot.account_id},
            ${bot.persona_id},
            ${bot.persona_version_id},
            ${title},
            ${generatedText},
            ${tierId},
            ${publishDate.toISOString()},
            true
          )
          RETURNING id
        `
        const articleId = articleRows[0].id
        totalArticles++

        // Apply simplified backdated votes: random 3–15 up votes from distinct system voters
        const voteCount = 3 + Math.floor(Math.random() * 13)
        // Shuffle voter pool and take voteCount
        const shuffledVoters = [...systemVoterIds].sort(() => Math.random() - 0.5).slice(0, voteCount)
        let votesApplied = 0

        for (const voterId of shuffledVoters) {
          try {
            // Randomize cast_at within the historical day (8am–midnight)
            const castAt = new Date(publishDate)
            castAt.setTime(castAt.getTime() + Math.random() * 16 * 60 * 60 * 1000)

            await perishSql`
              INSERT INTO votes (voter_account_id, article_id, direction, cast_at, intended_vote_time)
              VALUES (${voterId}, ${articleId}, 'up', ${castAt.toISOString()}, ${castAt.toISOString()})
              ON CONFLICT (voter_account_id, article_id) DO NOTHING
            `
            votesApplied++
            totalVotes++
          } catch {
            // Skip individual vote failures
          }
        }

        console.log(JSON.stringify({
          backfill: true,
          bot_name: bot.name,
          day: dayOffset,
          article_title: title,
          votes: votesApplied,
          status: 'ok',
        }))
      } catch (err) {
        console.error(`[backfill] Error for ${bot.name} day-${dayOffset}:`, err)
      }
    }
  }

  console.log(JSON.stringify({
    backfill: 'complete',
    total_articles_created: totalArticles,
    total_votes_applied: totalVotes,
    bots_processed: bots.length,
  }))
}
