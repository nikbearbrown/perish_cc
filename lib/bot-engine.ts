import { perishSql, selectRandomSeed, buildSeedFromExMachina } from '@/lib/db-perish'
import { generateContent, LLMException } from '@/lib/llm'

export interface BotConfig {
  account_id: string
  persona_id: string
  active_prompt_text: string
  persona_version_id: string
  tier_weights: Record<string, number>
  name: string
  queued_seed?: string | null
}

const TIER_NAMES: Record<number, string> = {
  1: 'Pattern',
  2: 'Embodied',
  3: 'Social',
  4: 'Metacognitive',
  5: 'Causal',
  6: 'Collective',
  7: 'Wisdom',
}

export async function getActiveBots(): Promise<BotConfig[]> {
  const rows = await perishSql`
    SELECT
      ba.account_id,
      ba.tier_weights,
      p.id AS persona_id,
      p.name,
      p.queued_seed,
      pv.id AS persona_version_id,
      pv.prompt_text AS active_prompt_text
    FROM bot_accounts ba
    JOIN accounts a ON a.id = ba.account_id
    JOIN personas p ON p.account_id = ba.account_id
    JOIN persona_versions pv ON pv.persona_id = p.id AND pv.is_active = true
    WHERE ba.is_active = true
  `

  return rows.map(r => ({
    account_id: r.account_id,
    persona_id: r.persona_id,
    active_prompt_text: r.active_prompt_text,
    persona_version_id: r.persona_version_id,
    tier_weights: typeof r.tier_weights === 'string' ? JSON.parse(r.tier_weights) : r.tier_weights,
    name: r.name,
    queued_seed: r.queued_seed || null,
  }))
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

function getTierNameByWeight(tierWeights: Record<string, number>): string {
  const tierId = pickPrimaryTier(tierWeights)
  return TIER_NAMES[tierId] || 'intelligence'
}

async function clearQueuedSeed(personaId: string): Promise<void> {
  await perishSql`
    UPDATE personas SET queued_seed = NULL WHERE id = ${personaId}
  `
}

async function selectSeed(bot: BotConfig): Promise<{
  seed: string
  source: 'queued' | 'ex_machina' | 'tier_weight'
}> {
  // 1. Check queued_seed first
  if (bot.queued_seed) {
    const seed = bot.queued_seed
    await clearQueuedSeed(bot.persona_id)
    return { seed, source: 'queued' }
  }

  // 2. Try Ex Machina pool
  const exMachinaSeed = await selectRandomSeed()
  if (exMachinaSeed) {
    const tier_name = getTierNameByWeight(bot.tier_weights)
    return {
      seed: buildSeedFromExMachina(exMachinaSeed, tier_name),
      source: 'ex_machina',
    }
  }

  // 3. Fallback: tier-weight seed (current logic)
  const tier_name = getTierNameByWeight(bot.tier_weights)
  return {
    seed: `Explore the role of ${tier_name} in the question of what intelligence is.`,
    source: 'tier_weight',
  }
}

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim() || ''
  if (firstLine.startsWith('#')) {
    const title = firstLine.replace(/^#+\s*/, '').trim()
    if (title) return title
  }
  if (firstLine.length > 0 && firstLine.length <= 100) return firstLine
  return text.slice(0, 80).replace(/\s\S*$/, '') || 'Untitled'
}

export async function generateBotArticle(bot: BotConfig): Promise<string | null> {
  const tierId = pickPrimaryTier(bot.tier_weights)
  const { seed, source } = await selectSeed(bot)

  try {
    const result = await generateContent({
      persona_prompt: bot.active_prompt_text,
      seed,
      mode: 'bot_seed',
      account_id: bot.account_id,
      tier_id: tierId,
    })

    console.log(`[bot-engine] ${bot.name} seed source: ${source}`)
    return result.generated_text
  } catch (err) {
    const msg = err instanceof LLMException ? err.code : String(err)
    console.error(`[bot-engine] Article generation failed for ${bot.name}:`, msg)
    return null
  }
}

export async function publishBotArticle(
  bot: BotConfig,
  generatedText: string,
  tierId: number,
): Promise<string | null> {
  const title = extractTitle(generatedText)

  try {
    const rows = await perishSql`
      INSERT INTO articles (account_id, persona_id, persona_version_id, title, body, tier_id, is_backdated)
      VALUES (${bot.account_id}, ${bot.persona_id}, ${bot.persona_version_id}, ${title}, ${generatedText}, ${tierId}, false)
      RETURNING id
    `

    await perishSql`
      UPDATE bot_accounts SET last_posted_at = NOW() WHERE account_id = ${bot.account_id}
    `

    return rows[0].id
  } catch (err) {
    console.error(`[bot-engine] Publish failed for ${bot.name}:`, err)
    return null
  }
}

export async function allocateBotVotes(bot: BotConfig): Promise<void> {
  try {
    // Get articles from last 24 hours, not by this bot, not already voted on by this bot
    const candidates = await perishSql`
      SELECT a.id, a.tier_id
      FROM articles a
      LEFT JOIN votes v ON v.article_id = a.id AND v.voter_account_id = ${bot.account_id}
      WHERE a.account_id != ${bot.account_id}
        AND a.published_at >= NOW() - INTERVAL '24 hours'
        AND v.id IS NULL
      ORDER BY a.published_at DESC
    `

    if (candidates.length === 0) return

    // Score each article by tier weight
    const scored = candidates.map(c => ({
      id: c.id,
      tier_id: c.tier_id,
      weight: bot.tier_weights[String(c.tier_id)] || 0,
    }))

    // Filter: only consider articles with weight > 0.3 (abstain on low-affinity tiers)
    const eligible = scored.filter(s => s.weight > 0.3)
    if (eligible.length === 0) return

    // Weighted random sampling: select up to 5 articles probabilistically
    const selected = weightedRandomSample(eligible, 5)

    // ⚑ EXPERIMENTAL: True vote timing distribution requires a queue system (Redis, etc).
    // This implementation records intended timing analytically but does NOT actually delay
    // execution. All votes are inserted immediately within the cron window. The
    // intended_vote_time column exists for future analytics and audit purposes only.
    const cronBaseHour = 6 // 6am UTC, when bot-pipeline cron runs

    for (const item of selected) {
      try {
        // Generate a random offset: 0–18 hours from 6am UTC
        const offsetHours = Math.random() * 18
        const intendedTime = new Date()
        intendedTime.setUTCHours(cronBaseHour, 0, 0, 0)
        intendedTime.setTime(intendedTime.getTime() + offsetHours * 60 * 60 * 1000)

        await perishSql`
          INSERT INTO votes (voter_account_id, article_id, direction, intended_vote_time)
          VALUES (${bot.account_id}, ${item.id}, 'up', ${intendedTime.toISOString()})
          ON CONFLICT (voter_account_id, article_id) DO NOTHING
        `
      } catch {
        // Skip individual vote failures
      }
    }

    await perishSql`
      UPDATE bot_accounts SET last_voted_at = NOW() WHERE account_id = ${bot.account_id}
    `
  } catch (err) {
    console.error(`[bot-engine] Vote allocation failed for ${bot.name}:`, err)
  }
}

/** Weighted random sampling without replacement. Returns up to `count` items. */
function weightedRandomSample<T extends { weight: number }>(items: T[], count: number): T[] {
  const pool = [...items]
  const selected: T[] = []

  while (selected.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0)
    if (totalWeight <= 0) break

    let r = Math.random() * totalWeight
    let pickedIndex = 0
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight
      if (r <= 0) {
        pickedIndex = i
        break
      }
    }

    selected.push(pool[pickedIndex])
    pool.splice(pickedIndex, 1)
  }

  return selected
}

export async function allocateBotComments(bot: BotConfig): Promise<void> {
  try {
    // Get recent articles not by this bot, scored by tier weight × recency
    const candidates = await perishSql`
      SELECT a.id, a.title, a.body, a.tier_id, a.published_at
      FROM articles a
      WHERE a.account_id != ${bot.account_id}
        AND a.published_at >= NOW() - INTERVAL '48 hours'
      ORDER BY a.published_at DESC
      LIMIT 20
    `

    if (candidates.length === 0) return

    // Score by tier weight × recency (newer = higher recency score)
    const now = Date.now()
    const scored = candidates.map(c => {
      const tierWeight = bot.tier_weights[String(c.tier_id)] || 0
      const ageMs = now - new Date(c.published_at).getTime()
      const recencyScore = Math.max(0, 1 - ageMs / (48 * 60 * 60 * 1000)) // 0–1, linear decay over 48h
      return { ...c, score: tierWeight * recencyScore }
    })

    // Take top 3 by combined score
    scored.sort((a, b) => b.score - a.score)
    const toComment = scored.slice(0, 3)

    for (const article of toComment) {
      try {
        // Use title + first 500 chars of body as comment seed
        const seed = article.title + '\n' + (article.body || '').substring(0, 500)

        const result = await generateContent({
          persona_prompt: bot.active_prompt_text,
          seed,
          mode: 'comment',
          account_id: bot.account_id,
        })

        await perishSql`
          INSERT INTO comments (account_id, article_id, persona_id, body)
          VALUES (${bot.account_id}, ${article.id}, ${bot.persona_id}, ${result.generated_text})
        `
      } catch (err) {
        const msg = err instanceof LLMException ? err.code : String(err)
        console.error(`[bot-engine] Comment generation failed for ${bot.name} on article ${article.id}:`, msg)
      }
    }

    await perishSql`
      UPDATE bot_accounts SET last_commented_at = NOW() WHERE account_id = ${bot.account_id}
    `
  } catch (err) {
    console.error(`[bot-engine] Comment allocation failed for ${bot.name}:`, err)
  }
}
