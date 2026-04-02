/**
 * Perish E2E Smoke Test
 *
 * Usage: npx tsx scripts/e2e-test.ts [base_url]
 * Default base_url: http://localhost:3000
 *
 * Requires: a running Perish instance with database migrations applied,
 * at least one active bot with articles, and LLM_API_KEY configured.
 *
 * This is a lightweight smoke test, not a full test suite.
 */

const BASE = process.argv[2] || 'http://localhost:3000'

let passed = 0
let failed = 0
const results: { name: string; pass: boolean; detail?: string }[] = []

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    results.push({ name, pass: true })
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    results.push({ name, pass: false, detail })
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function extractCookies(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() || []
  return setCookies.map(c => c.split(';')[0]).join('; ')
}

function mergeCookies(existing: string, res: Response): string {
  const newCookies = extractCookies(res)
  if (!newCookies) return existing
  if (!existing) return newCookies
  // Merge: new values override existing by name
  const map = new Map<string, string>()
  for (const c of existing.split('; ')) {
    const [k] = c.split('=')
    if (k) map.set(k, c)
  }
  for (const c of newCookies.split('; ')) {
    const [k] = c.split('=')
    if (k) map.set(k, c)
  }
  return Array.from(map.values()).join('; ')
}

async function post(path: string, body: Record<string, unknown>, cookies = ''): Promise<{ res: Response; data: unknown; cookies: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookies ? { Cookie: cookies } : {}) },
    body: JSON.stringify(body),
    redirect: 'manual',
  })
  const merged = mergeCookies(cookies, res)
  let data: unknown = null
  try { data = await res.json() } catch { data = null }
  return { res, data, cookies: merged }
}

async function get(path: string, cookies = ''): Promise<{ res: Response; data: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookies ? { Cookie: cookies } : {},
    redirect: 'manual',
  })
  let data: unknown = null
  try { data = await res.json() } catch { data = null }
  return { res, data }
}

// ──────────────────────────────────────────────
// Player 1 Journey
// ──────────────────────────────────────────────

async function player1() {
  console.log('\n── Player 1: Full Creator Journey ──\n')

  const email1 = `e2e-player1-${Date.now()}@test.perish.cc`
  let cookies = ''
  let personaId = ''
  let generationId = ''
  let articleId = ''
  let personaVersionId = ''

  // 1. Register
  const reg = await post('/api/auth/register', { email: email1, password: 'testpass123', display_name: 'E2E Player 1' })
  assert('Register: 201', reg.res.status === 201, `got ${reg.res.status}`)
  assert('Register: session cookie set', reg.cookies.includes('perish_session'), `cookies: ${reg.cookies.substring(0, 60)}`)
  cookies = reg.cookies
  const accountId = (reg.data as Record<string, string>)?.accountId

  // 2. Create persona
  const persona = await post('/api/personas', {
    name: 'E2E Test Persona',
    description: 'A test persona for end-to-end validation.',
    prompt_text: 'Write concisely about any topic given. Keep responses under 500 words. Be direct and analytical.',
    byline_enabled: false,
  }, cookies)
  assert('Create persona: 201', persona.res.status === 201, `got ${persona.res.status}`)
  personaId = (persona.data as Record<string, string>)?.personaId || ''
  assert('Create persona: personaId returned', !!personaId, `got: ${personaId}`)

  // 3. Seed article
  const seed = await post('/api/articles/seed', {
    seed_text: 'The relationship between pattern recognition and genuine understanding in artificial intelligence.',
    tier_id: 1,
    persona_id: personaId,
  }, cookies)
  assert('Seed article: 200', seed.res.status === 200, `got ${seed.res.status}: ${JSON.stringify(seed.data)}`)
  const seedData = seed.data as Record<string, string>
  assert('Seed article: generated_text not empty', !!(seedData?.generated_text), 'generated_text was empty')
  generationId = seedData?.generation_id || ''
  personaVersionId = seedData?.persona_version_id || ''

  // 4. Publish article
  const pub = await post('/api/articles/publish', {
    generation_id: generationId,
    tier_id: 1,
    persona_id: personaId,
  }, cookies)
  assert('Publish article: 201', pub.res.status === 201, `got ${pub.res.status}: ${JSON.stringify(pub.data)}`)
  articleId = (pub.data as Record<string, string>)?.articleId || ''
  assert('Publish article: articleId returned', !!articleId, `got: ${articleId}`)

  // 5. Check seeded state via /api/auth/me (indirect — seeded means cannot seed again)
  // We test this by attempting to seed again (step 6)

  // 6. Attempt to seed again
  const seed2 = await post('/api/articles/seed', {
    seed_text: 'Another topic.',
    tier_id: 2,
    persona_id: personaId,
  }, cookies)
  assert('Second seed: 409 (already_seeded)', seed2.res.status === 409, `got ${seed2.res.status}`)

  // 7. Vote on a bot article (find one from feed)
  const feed = await get('/api/feed?page=1&limit=5')
  const feedData = feed.data as { articles: { id: string; account_id: string }[] }
  const botArticle = feedData?.articles?.find(a => a.account_id !== accountId)
  if (botArticle) {
    const vote = await post('/api/votes', { article_id: botArticle.id, direction: 'up' }, cookies)
    assert('Vote on other article: 200', vote.res.status === 200, `got ${vote.res.status}: ${JSON.stringify(vote.data)}`)
    const voteData = vote.data as Record<string, number>
    assert('Vote: votes_remaining = 4', voteData?.votes_remaining === 4, `got ${voteData?.votes_remaining}`)
  } else {
    assert('Vote on other article: found article to vote on', false, 'no non-own article in feed')
    assert('Vote: votes_remaining = 4', false, 'skipped — no article')
  }

  // 8. Vote on own article
  const selfVote = await post('/api/votes', { article_id: articleId, direction: 'up' }, cookies)
  assert('Self-vote: 403', selfVote.res.status === 403, `got ${selfVote.res.status}`)

  // 9. Generate comment (on own article is fine — self-comment is allowed)
  const targetArticleId = botArticle?.id || articleId
  const commentGen = await post('/api/comments/generate', {
    article_id: targetArticleId,
    input_text: 'Interesting perspective on pattern intelligence.',
    persona_id: personaId,
  }, cookies)
  assert('Generate comment: 200', commentGen.res.status === 200, `got ${commentGen.res.status}: ${JSON.stringify(commentGen.data)}`)
  const commentData = commentGen.data as Record<string, string>
  assert('Generate comment: generated_comment not empty', !!(commentData?.generated_comment), 'generated_comment was empty')
  const commentGenId = commentData?.generation_id || ''

  // 10. Post comment
  const commentPost = await post('/api/comments/post', {
    generation_id: commentGenId,
    article_id: targetArticleId,
    persona_id: personaId,
  }, cookies)
  assert('Post comment: 201', commentPost.res.status === 201, `got ${commentPost.res.status}`)

  // 11. Check comments_remaining = 2
  const me = await get('/api/auth/me', cookies)
  const meData = me.data as Record<string, number>
  assert('Comments remaining: 2', meData?.comments_remaining === 2, `got ${meData?.comments_remaining}`)

  // 12. View own persona profile — prompt should NOT be in response
  const ownProfile = await get(`/api/personas/${personaId}/profile`)
  const ownProfileData = ownProfile.data as Record<string, unknown>
  assert('Own persona profile: 200', ownProfile.res.status === 200, `got ${ownProfile.res.status}`)
  assert('Own persona profile: active_prompt is null (human)', ownProfileData?.active_prompt === null, `got: ${typeof ownProfileData?.active_prompt}`)

  // 13. View bot persona profile — prompt SHOULD be in response
  // Find a bot persona from feed
  if (botArticle) {
    const botFeedArticle = await get(`/api/feed/${botArticle.id}`)
    const botFeedData = botFeedArticle.data as Record<string, string>
    const botPersonaId = botFeedData?.persona_id
    if (botPersonaId) {
      const botProfile = await get(`/api/personas/${botPersonaId}/profile`)
      const botProfileData = botProfile.data as Record<string, unknown>
      assert('Bot persona profile: 200', botProfile.res.status === 200, `got ${botProfile.res.status}`)
      assert('Bot persona profile: active_prompt present', typeof botProfileData?.active_prompt === 'string' && botProfileData.active_prompt.length > 0, `got: ${typeof botProfileData?.active_prompt}`)
    } else {
      assert('Bot persona profile: found persona_id', false, 'no persona_id in bot article')
      assert('Bot persona profile: active_prompt present', false, 'skipped')
    }
  } else {
    assert('Bot persona profile: found bot article', false, 'no bot articles in feed')
    assert('Bot persona profile: active_prompt present', false, 'skipped')
  }
}

// ──────────────────────────────────────────────
// Player 2 Journey
// ──────────────────────────────────────────────

async function player2() {
  console.log('\n── Player 2: Reader/Voter Journey ──\n')

  // 1. Fetch feed without auth
  const feedStart = Date.now()
  const feed = await get('/api/feed?page=1&limit=20')
  const feedLatency = Date.now() - feedStart
  const feedData = feed.data as { articles: { id: string; account_id: string; tier_id: number }[]; total: number }
  assert('Feed (no auth): 200', feed.res.status === 200, `got ${feed.res.status}`)
  assert('Feed: articles array not empty', (feedData?.articles?.length || 0) > 0, `got ${feedData?.articles?.length} articles`)
  assert(`Feed: responds in <2000ms`, feedLatency < 2000, `took ${feedLatency}ms`)

  // 2. Vote without auth
  const firstArticle = feedData?.articles?.[0]
  if (firstArticle) {
    const noAuthVote = await post('/api/votes', { article_id: firstArticle.id, direction: 'up' })
    assert('Vote without auth: 401', noAuthVote.res.status === 401, `got ${noAuthVote.res.status}`)
  } else {
    assert('Vote without auth: 401', false, 'no articles to vote on')
  }

  // 3. Register
  const email2 = `e2e-player2-${Date.now()}@test.perish.cc`
  const reg = await post('/api/auth/register', { email: email2, password: 'testpass456' })
  assert('Register Player 2: 201', reg.res.status === 201, `got ${reg.res.status}`)
  let cookies = reg.cookies

  // 4. Vote on feed article
  if (firstArticle) {
    const voteStart = Date.now()
    const vote = await post('/api/votes', { article_id: firstArticle.id, direction: 'up' }, cookies)
    const voteLatency = Date.now() - voteStart
    // May be 200 or 409 if player1 already voted on this from same article
    assert('Vote on feed article: 200 or 409', vote.res.status === 200 || vote.res.status === 409, `got ${vote.res.status}`)
    assert(`Vote: responds in <500ms`, voteLatency < 500, `took ${voteLatency}ms`)
  } else {
    assert('Vote on feed article: 200', false, 'no articles')
    assert('Vote: responds in <500ms', false, 'skipped')
  }

  // 5. Visit tier page
  const tier = await get('/api/tiers/pattern')
  const tierData = tier.data as Record<string, string>
  assert('Tier page: 200', tier.res.status === 200, `got ${tier.res.status}`)
  assert('Tier page: page_content not empty', !!(tierData?.page_content?.trim()), `page_content length: ${tierData?.page_content?.length}`)

  // 6. Visit bot persona profile
  const botArticle = feedData?.articles?.find(a => {
    // We can't check is_bot from feed data reliably here, just pick an article
    return true
  })
  if (botArticle) {
    const articleDetail = await get(`/api/feed/${botArticle.id}`)
    const articleData = articleDetail.data as Record<string, unknown>
    if (articleData?.is_bot && articleData?.persona_id) {
      const botProfile = await get(`/api/personas/${articleData.persona_id}/profile`)
      const botData = botProfile.data as Record<string, unknown>
      assert('Bot profile: active_prompt present', typeof botData?.active_prompt === 'string' && (botData.active_prompt as string).length > 0, `type: ${typeof botData?.active_prompt}`)
    } else {
      // Try the first few articles to find a bot
      let foundBot = false
      for (const art of feedData.articles.slice(0, 5)) {
        const detail = await get(`/api/feed/${art.id}`)
        const d = detail.data as Record<string, unknown>
        if (d?.is_bot && d?.persona_id) {
          const bp = await get(`/api/personas/${d.persona_id}/profile`)
          const bpData = bp.data as Record<string, unknown>
          assert('Bot profile: active_prompt present', typeof bpData?.active_prompt === 'string' && (bpData.active_prompt as string).length > 0, `type: ${typeof bpData?.active_prompt}`)
          foundBot = true
          break
        }
      }
      if (!foundBot) {
        assert('Bot profile: active_prompt present', false, 'no bot articles found in feed')
      }
    }
  } else {
    assert('Bot profile: active_prompt present', false, 'no articles in feed')
  }
}

// ──────────────────────────────────────────────
// Run
// ──────────────────────────────────────────────

async function main() {
  console.log(`\nPerish E2E Smoke Test`)
  console.log(`Base URL: ${BASE}\n`)

  try {
    await player1()
  } catch (err) {
    console.error('\nPlayer 1 journey crashed:', err)
  }

  try {
    await player2()
  } catch (err) {
    console.error('\nPlayer 2 journey crashed:', err)
  }

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    for (const r of results) {
      if (!r.pass) console.log(`  ✗ ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
    }
  }

  console.log()
  process.exit(failed > 0 ? 1 : 0)
}

main()
