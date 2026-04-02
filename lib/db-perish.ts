import { neon, NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null

export const perishSql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      if (!_sql) _sql = neon(process.env.DATABASE_URL!)
      return (_sql as Function)(...args)
    },
    get(_target, prop) {
      if (!_sql) _sql = neon(process.env.DATABASE_URL!)
      return Reflect.get(_sql, prop)
    },
  }
)

export interface PersonaWithActiveVersion {
  id: string
  account_id: string
  name: string
  description: string
  byline_enabled: boolean
  byline_text: string | null
  byline_link: string | null
  version_number: number
  version_created_at: string
  prompt_text?: string
}

export async function getPersonaWithActiveVersion(
  personaId: string,
  requestingAccountId: string | null,
): Promise<PersonaWithActiveVersion | null> {
  const rows = await perishSql`
    SELECT
      p.id,
      p.account_id,
      p.name,
      p.description,
      p.byline_enabled,
      p.byline_text,
      p.byline_link,
      pv.version_number,
      pv.created_at AS version_created_at,
      pv.prompt_text
    FROM personas p
    JOIN persona_versions pv ON pv.persona_id = p.id AND pv.is_active = true
    WHERE p.id = ${personaId}
  `

  if (rows.length === 0) return null

  const row = rows[0]

  const result: PersonaWithActiveVersion = {
    id: row.id,
    account_id: row.account_id,
    name: row.name,
    description: row.description,
    byline_enabled: row.byline_enabled,
    byline_text: row.byline_text,
    byline_link: row.byline_link,
    version_number: row.version_number,
    version_created_at: row.version_created_at,
  }

  if (requestingAccountId && requestingAccountId === row.account_id) {
    result.prompt_text = row.prompt_text
  }

  return result
}

export async function hasSeededToday(accountId: string): Promise<boolean> {
  const rows = await perishSql`
    SELECT seeded FROM daily_seed_state
    WHERE account_id = ${accountId} AND date = CURRENT_DATE
  `
  if (rows.length === 0) return false
  return rows[0].seeded === true
}

export async function getVotesRemaining(accountId: string): Promise<number> {
  const rows = await perishSql`
    SELECT votes_remaining FROM daily_vote_state
    WHERE account_id = ${accountId} AND date = CURRENT_DATE
  `
  if (rows.length === 0) return 5
  return rows[0].votes_remaining
}

export async function getCommentsRemaining(accountId: string): Promise<number> {
  const rows = await perishSql`
    SELECT comments_remaining FROM daily_comment_state
    WHERE account_id = ${accountId} AND date = CURRENT_DATE
  `
  if (rows.length === 0) return 3
  return rows[0].comments_remaining
}

// --- Ex Machina seed pool ---

export interface ExMachinaSeed {
  post_id: string
  seed_summary: string
  title: string
  published_at: string
}

export async function getExMachinaPool(): Promise<ExMachinaSeed[]> {
  const rows = await perishSql`
    SELECT id AS post_id, seed_summary, title, published_at
    FROM blog_posts
    WHERE seed_summary IS NOT NULL AND published = true
    ORDER BY published_at DESC
  `
  return rows as ExMachinaSeed[]
}

export async function selectRandomSeed(): Promise<ExMachinaSeed | null> {
  const pool = await getExMachinaPool()
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export function buildSeedFromExMachina(seed: ExMachinaSeed, tier_name: string): string {
  return `${seed.seed_summary} Consider particularly the dimension of ${tier_name}.`
}
