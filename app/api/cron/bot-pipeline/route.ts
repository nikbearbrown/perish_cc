import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveBots,
  allocateBotVotes,
  allocateBotComments,
  runDailyPipeline,
} from '@/lib/bot-engine'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Run unified pipeline for bots + auto-mode personas
  const pipelineResult = await runDailyPipeline()

  // Allocate votes and comments for bots only
  const bots = await getActiveBots()
  for (const bot of bots) {
    try {
      // NOTE: In serverless, all bots execute within the same cron window.
      // Vote timing is approximate — staggering is not possible in this environment.
      await allocateBotVotes(bot)
      await allocateBotComments(bot)
    } catch (err) {
      console.error(`[bot-pipeline] Vote/comment allocation failed for ${bot.name}:`, err)
    }
  }

  const result = {
    participants_processed: pipelineResult.processed,
    succeeded: pipelineResult.succeeded,
    failed: pipelineResult.failed,
    bots_with_votes_comments: bots.length,
    run_at: new Date().toISOString(),
  }

  console.log(JSON.stringify({ cron: 'bot-pipeline', ...result }))

  return NextResponse.json(result)
}
