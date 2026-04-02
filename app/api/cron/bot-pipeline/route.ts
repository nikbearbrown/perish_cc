import { NextRequest, NextResponse } from 'next/server'
import { perishSql } from '@/lib/db-perish'
import {
  getActiveBots,
  generateBotArticle,
  publishBotArticle,
  allocateBotVotes,
  allocateBotComments,
} from '@/lib/bot-engine'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const bots = await getActiveBots()
  let succeeded = 0
  let failed = 0

  for (const bot of bots) {
    try {
      // Check if bot already posted today
      const todayCheck = await perishSql`
        SELECT id FROM articles
        WHERE account_id = ${bot.account_id}
          AND published_at >= CURRENT_DATE
        LIMIT 1
      `
      if (todayCheck.length > 0) {
        console.log(`[bot-pipeline] ${bot.name} already posted today, skipping article`)
      } else {
        // Generate and publish article
        const generatedText = await generateBotArticle(bot)
        if (generatedText) {
          const tierWeights = bot.tier_weights
          let maxWeight = -1
          let primaryTier = 1
          for (const [tier, weight] of Object.entries(tierWeights)) {
            if (weight > maxWeight) {
              maxWeight = weight
              primaryTier = parseInt(tier, 10)
            }
          }
          const articleId = await publishBotArticle(bot, generatedText, primaryTier)
          if (articleId) {
            console.log(`[bot-pipeline] ${bot.name} published article ${articleId}`)
          }
        }
      }

      // Allocate votes
      // NOTE: In serverless, all bots execute within the same cron window.
      // Vote timing is approximate — staggering is not possible in this environment.
      await allocateBotVotes(bot)

      // Allocate comments
      await allocateBotComments(bot)

      succeeded++
    } catch (err) {
      console.error(`[bot-pipeline] Bot ${bot.name} failed:`, err)
      failed++
    }
  }

  const result = {
    bots_processed: bots.length,
    succeeded,
    failed,
    run_at: new Date().toISOString(),
  }

  console.log(JSON.stringify({ cron: 'bot-pipeline', ...result }))

  return NextResponse.json(result)
}
