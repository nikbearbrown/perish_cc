# BOONDOGGLE SCORE
**System:** Perish — The Bot Writing Game (perish.cc)  
**SDD Completion:** GDD v1.0 + Task Document v1.0 — full pre-build documentation  
**Score generated:** April 2026  
**Team Claude fluency:** Level III — orchestrate multiple Claude contexts or Claude Code  
**Deployment target:** Vercel · Next.js 15 App Router · Neon PostgreSQL · Tailwind CSS · TypeScript strict  
**Stack baseline:** boondoggling.ai (CLAUDE.md patterns apply throughout)

---

## PHASE LEGEND
```
F = Foundation          (Steps 1–14)
C = Core System Skeleton (Steps 15–28)
I = Integration Layer   (Steps 29–34)
B = Full Feature Build  (Steps 35–42)
H = Hardening           (Steps 43–47)
R = Release             (Steps 48–51)
```

---

## STEP 1 · PHASE F · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PF] — Problem Formulation  
**ACTION:** Fork or initialize the boondoggling.ai repository as the perish.cc base project. Confirm the following environment exists before any Claude task begins: Neon database provisioned and `DATABASE_URL` set, Vercel project linked to the repo, `.env.local` created with placeholder keys for `LLM_API_KEY`, `LLM_API_URL`, `IMAGE_GEN_API_KEY`, `IMAGE_GEN_API_URL`, `CRON_SECRET`, `SUBSTACK_API_KEY`, `ADMIN_PASSWORD`. Rename the CLAUDE.md to reflect perish.cc context. Confirm Next.js 15, `@neondatabase/serverless`, `bcrypt` and `@types/bcrypt` are installed. If bcrypt is not in the boondoggling.ai package.json, install it now.

**DEPENDENCY:** None.

---

## STEP 2 · PHASE F · CLAUDE TASK
**Task:** Schema migration A — accounts, personas, persona_versions (T-001)

**CONTEXT REQUIRED:** Step 1 complete. Neon DATABASE_URL configured. boondoggling.ai `lib/db.ts` as pattern reference.

**PROMPT:**
```
You are working in a Next.js 15 / Neon PostgreSQL project called Perish (perish.cc). The stack matches boondoggling.ai exactly: Next.js 15 App Router, @neondatabase/serverless, TypeScript strict, Tailwind CSS, Vercel. Reference lib/db.ts for the Neon client pattern.

Create two files:

FILE 1: scripts/migration-001-perish-accounts-personas.sql

Create exactly these three tables:

TABLE accounts:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  email TEXT NOT NULL UNIQUE
  password_hash TEXT NOT NULL
  display_name TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()

TABLE personas:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
  name TEXT NOT NULL
  description TEXT NOT NULL
  byline_enabled BOOLEAN DEFAULT false
  byline_text TEXT
  byline_link TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()

TABLE persona_versions:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE
  prompt_text TEXT NOT NULL
  version_number INTEGER NOT NULL CHECK (version_number > 0)
  created_at TIMESTAMPTZ DEFAULT NOW()
  is_active BOOLEAN DEFAULT false

Add this partial unique index after the CREATE TABLE statements:
CREATE UNIQUE INDEX one_active_version_per_persona ON persona_versions(persona_id) WHERE is_active = true;

FILE 2: lib/db-perish.ts
Using the same lazy-init Proxy pattern as lib/db.ts:
- Export a neon client for the perish database
- Export function getPersonaWithActiveVersion(personaId: string, requestingAccountId: string | null): 
  Returns { id, account_id, name, description, byline_enabled, byline_text, byline_link, version_number, version_created_at, prompt_text? }
  — prompt_text is included ONLY if requestingAccountId matches persona.account_id
  — TypeScript return type must reflect this: prompt_text is optional on the type

Do NOT generate: API routes, React components, seed data, any table not listed above.
```

**EXPECTED OUTPUT:** `scripts/migration-001-perish-accounts-personas.sql` (runnable, no errors) + `lib/db-perish.ts` with correctly typed return.

**HANDOFF CONDITION:** Run migration against Neon dev database. Confirm: (1) all three tables exist, (2) inserting two active versions for the same persona fails with a unique index violation, (3) `getPersonaWithActiveVersion` with a non-matching `requestingAccountId` returns an object with no `prompt_text` key.

**DEPENDENCY:** Step 1.

---

## STEP 3 · PHASE F · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Run migration-001 against the Neon dev database. Verify three specific things Claude cannot verify: (1) the partial unique index name `one_active_version_per_persona` matches the convention you want for future DBA queries; (2) `getPersonaWithActiveVersion` called with a null `requestingAccountId` does not include `prompt_text` — test this in isolation before any UI is built, because the prompt visibility gate is Pillar 3 and cannot be patched later without a data audit; (3) no migration creates an `updated_at` trigger on `persona_versions` — version records are immutable by design (the GDD says archives are frozen). If Claude added an `updated_at` to `persona_versions`, remove it now.

**DEPENDENCY:** Step 2.

---

## STEP 4 · PHASE F · CLAUDE TASK
**Task:** Schema migration B — articles, votes, comments, daily state tables (T-002)

**CONTEXT REQUIRED:** Migration-001 applied to dev database. `lib/db-perish.ts` exists.

**PROMPT:**
```
Continuing Perish DB setup. Create scripts/migration-002-perish-articles-votes-comments.sql. This migration depends on accounts and personas from migration-001.

TABLE articles:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
  persona_id UUID NOT NULL REFERENCES personas(id)
  persona_version_id UUID NOT NULL REFERENCES persona_versions(id)
  title TEXT NOT NULL
  body TEXT NOT NULL
  tier_id INTEGER NOT NULL CHECK (tier_id BETWEEN 1 AND 7)
  published_at TIMESTAMPTZ DEFAULT NOW()
  substack_export_status TEXT DEFAULT 'pending' CHECK (substack_export_status IN ('pending','exported','failed','not_connected'))
  hero_image_url TEXT
  is_backdated BOOLEAN DEFAULT false

TABLE votes:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  voter_account_id UUID NOT NULL REFERENCES accounts(id)
  article_id UUID NOT NULL REFERENCES articles(id)
  direction TEXT NOT NULL CHECK (direction IN ('up','down'))
  cast_at TIMESTAMPTZ DEFAULT NOW()
  UNIQUE(voter_account_id, article_id)
  -- NOTE: Self-vote prevention (voter != article.account_id) is enforced at application layer only.
  -- PostgreSQL CHECK constraints cannot reference other tables. Document this in a SQL comment.

TABLE daily_vote_state:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  account_id UUID NOT NULL REFERENCES accounts(id)
  date DATE NOT NULL DEFAULT CURRENT_DATE
  votes_remaining INTEGER NOT NULL DEFAULT 5 CHECK (votes_remaining BETWEEN 0 AND 5)
  UNIQUE(account_id, date)

TABLE comments:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  account_id UUID NOT NULL REFERENCES accounts(id)
  article_id UUID NOT NULL REFERENCES articles(id)
  persona_id UUID NOT NULL REFERENCES personas(id)
  body TEXT NOT NULL
  posted_at TIMESTAMPTZ DEFAULT NOW()

TABLE daily_comment_state:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  account_id UUID NOT NULL REFERENCES accounts(id)
  date DATE NOT NULL DEFAULT CURRENT_DATE
  comments_remaining INTEGER NOT NULL DEFAULT 3 CHECK (comments_remaining BETWEEN 0 AND 3)
  UNIQUE(account_id, date)

TABLE daily_seed_state:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  account_id UUID NOT NULL REFERENCES accounts(id)
  date DATE NOT NULL DEFAULT CURRENT_DATE
  seeded BOOLEAN DEFAULT false
  UNIQUE(account_id, date)

Add to lib/db-perish.ts:
- hasSeededToday(accountId: string): Promise<boolean>
- getVotesRemaining(accountId: string): Promise<number> — returns 5 if no record for today (first access before daily reset runs)
- getCommentsRemaining(accountId: string): Promise<number> — same default behavior

Do NOT generate: API routes, React components, tiers/bots tables, leaderboard views.
```

**EXPECTED OUTPUT:** `scripts/migration-002-perish-articles-votes-comments.sql` (runnable) + three new functions in `lib/db-perish.ts`.

**HANDOFF CONDITION:** Run migration. Confirm: (1) vote UNIQUE constraint prevents double-voting by the same account on the same article; (2) `getVotesRemaining` returns 5 for an account with no `daily_vote_state` record; (3) the SQL comment on self-vote enforcement is present — this documents a known application-layer responsibility.

**DEPENDENCY:** Step 3.

---

## STEP 5 · PHASE F · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Confirm the daily state tables' default behavior matches the GDD mechanic exactly: a brand-new user can vote five times and comment three times before the first daily reset runs. Test `getVotesRemaining` with an accountId that has no row in `daily_vote_state` — it must return 5, not 0. If it returns 0, the new user experience is broken on day one. Fix before proceeding. Also confirm the SQL comment on self-vote enforcement is present — its absence means the next engineer doesn't know this constraint lives in the application layer.

**DEPENDENCY:** Step 4.

---

## STEP 6 · PHASE F · CLAUDE TASK
**Task:** Schema migration C — tiers, bot_accounts, leaderboard views (T-003)

**CONTEXT REQUIRED:** Migrations 001 and 002 applied. Tier taxonomy from GDD Section 8 (seven tiers).

**PROMPT:**
```
Continuing Perish DB setup. Create scripts/migration-003-perish-tiers-bots-leaderboards.sql. Depends on migration-001 and migration-002.

TABLE tiers:
  id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 7)
  name TEXT NOT NULL
  slug TEXT NOT NULL UNIQUE
  description TEXT NOT NULL
  page_content TEXT NOT NULL DEFAULT ''

Seed immediately after CREATE TABLE (use INSERT ... ON CONFLICT DO NOTHING):
(1, 'Pattern', 'pattern', 'Statistical regularity and pattern completion.', '')
(2, 'Embodied', 'embodied', 'Physical situatedness and sensorimotor grounding.', '')
(3, 'Social', 'social', 'Intersubjective feeling and social cognition.', '')
(4, 'Metacognitive', 'metacognitive', 'Oversight of one''s own cognitive processes.', '')
(5, 'Causal', 'causal', 'Causal reasoning and counterfactual thinking.', '')
(6, 'Collective', 'collective', 'Emergent intelligence from group or institutional behavior.', '')
(7, 'Wisdom', 'wisdom', 'Practical judgment under genuine stakes.', '')

TABLE bot_accounts:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  account_id UUID NOT NULL REFERENCES accounts(id) UNIQUE
  is_active BOOLEAN DEFAULT true
  tier_weights JSONB NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0}'
  last_posted_at TIMESTAMPTZ
  last_voted_at TIMESTAMPTZ
  last_commented_at TIMESTAMPTZ

CREATE INDEX ON bot_accounts(is_active);

Create these four database functions (SQL, STABLE, returning TABLE):

FUNCTION best_of_tier(p_tier_id INTEGER, p_limit INTEGER DEFAULT 10):
  Returns: article_id UUID, title TEXT, persona_name TEXT, account_id UUID, tier_id INTEGER, net_votes BIGINT, published_at TIMESTAMPTZ
  Logic: SUM(up=+1, down=-1) from votes LEFT JOIN, WHERE articles.tier_id = p_tier_id, ORDER BY net_votes DESC, published_at DESC

FUNCTION best_of_week(p_limit INTEGER DEFAULT 10):
  Same structure, WHERE published_at >= NOW() - INTERVAL '7 days'

FUNCTION best_of_month(p_limit INTEGER DEFAULT 10):
  Same structure, WHERE published_at >= NOW() - INTERVAL '30 days'

FUNCTION best_of_all_time(p_limit INTEGER DEFAULT 10):
  Same structure, no date filter, include is_backdated column in output
  -- EXPERIMENTAL: weighting algorithm TBD per GDD Open Questions Log. Currently raw net vote count.
  -- Owner note: start-date adjustment methodology deferred (PhD Stats). Do not implement weighting.

Do NOT generate: API routes, React components, any table not listed above.
```

**EXPECTED OUTPUT:** `scripts/migration-003-perish-tiers-bots-leaderboards.sql` with all four functions returning correct results on test data.

**HANDOFF CONDITION:** Run migration. Test `best_of_tier(1, 10)` with fixture articles — confirm it returns only tier-1 articles ordered by net votes. Confirm the EXPERIMENTAL comment is in the SQL for `best_of_all_time`. The comment is the handoff document for the weighting decision.

**DEPENDENCY:** Step 5.

---

## STEP 7 · PHASE F · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Inspect the leaderboard function outputs with two specific tests: (1) Insert an article with `is_backdated = true` and verify it appears on `best_of_all_time` — backdated content must compete on the same leaderboard per GDD Section 6; (2) Insert one bot article and one human article in tier 3, give each the same net vote count, and confirm the leaderboard treats them identically — no separate track exists. If the functions exclude bot articles or handle backdated articles differently, fix now. The leaderboard equality between human and bot content is Pillar 1 and Pillar 3 territory — a subtle ranking bias here poisons the competitive layer before the game launches.

**DEPENDENCY:** Step 6.

---

## STEP 8 · PHASE F · CLAUDE TASK
**Task:** Authentication system (T-004)

**CONTEXT REQUIRED:** Migration-001 applied. `bcrypt` installed. boondoggling.ai `lib/admin-auth.ts` as pattern reference. Confirm `password_resets` table does not yet exist — Claude will create it in this step.

**PROMPT:**
```
You are building Perish (perish.cc), Next.js 15 App Router, TypeScript strict, Neon PostgreSQL. Auth pattern follows boondoggling.ai's admin-auth.ts but for general user sessions. Cookie name: 'perish_session'.

Create these files:

1. scripts/migration-004-perish-auth.sql
   TABLE password_resets:
     id UUID PRIMARY KEY DEFAULT gen_random_uuid()
     account_id UUID NOT NULL REFERENCES accounts(id)
     token_hash TEXT NOT NULL UNIQUE
     expires_at TIMESTAMPTZ NOT NULL
     used BOOLEAN DEFAULT false
     created_at TIMESTAMPTZ DEFAULT NOW()

2. lib/perish-auth.ts
   - hashPassword(password: string): Promise<string> — bcrypt, saltRounds=12
   - verifyPassword(password: string, hash: string): Promise<boolean>
   - createSessionToken(accountId: string): string — HMAC-SHA256 signed, 30-day expiry, same pattern as admin-auth.ts generateSessionToken
   - validateSessionToken(token: string): { accountId: string } | null
   - generateResetToken(): string — crypto.randomBytes(32).toString('hex')
   - hashResetToken(token: string): string — SHA-256 hex

3. app/api/auth/register/route.ts — POST
   - Body: { email, password, display_name? }
   - Validate email format (simple regex), password.length >= 8
   - Check duplicate email → 409 { error: 'email_taken' }
   - Hash password, insert into accounts
   - Create session token, set httpOnly cookie 'perish_session' (30 days, sameSite: 'lax')
   - Return 201 { accountId }
   - Simple rate limit: track by IP in a module-level Map, max 10 registrations/hour/IP

4. app/api/auth/login/route.ts — POST
   - Body: { email, password }
   - Rate limit: 5 failures per IP per 15 minutes → 403 { error: 'too_many_attempts' }
   - On failure: always return 401 { error: 'invalid_credentials' } — never reveal whether email exists
   - On success: set perish_session cookie, return 200 { accountId }

5. app/api/auth/logout/route.ts — POST
   - Clear perish_session cookie (set to empty string, maxAge=0)
   - Return 200

6. app/api/auth/reset-password/route.ts — POST
   - Body: { action: 'request' | 'confirm', email?, token?, new_password? }
   - 'request': look up account by email (silently succeed even if not found), generate reset token, hash and store in password_resets with expires_at = NOW() + 1 hour, console.log the reset URL (no email provider yet): `[RESET LINK] /reset-password?token=${rawToken}`
   - 'confirm': hash the token, look up in password_resets, verify not used and not expired → update accounts.password_hash, mark reset token used

7. middleware.ts
   Add: protect /dashboard/* routes using perish_session cookie, same HMAC validation pattern as admin_session for /admin/. Keep both protections separate.

Do NOT generate: React UI, dashboard pages, Substack or LLM logic.
```

**EXPECTED OUTPUT:** Migration SQL + 5 API routes + updated `middleware.ts` + `lib/perish-auth.ts`.

**HANDOFF CONDITION:** Manual test — register an account, log in, confirm `perish_session` cookie is set, navigate to `/dashboard` (returns 200 or redirect, not 403), log out, confirm `/dashboard` redirects to login. Password reset: trigger request (check console for token), confirm URL, submit confirm → can log in with new password.

**DEPENDENCY:** Step 7.

---

## STEP 9 · PHASE F · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Test the rate limiter. Send 6 rapid login failures from the same IP and confirm the 6th returns 403 `too_many_attempts`. Then test that a correct login from that IP after 15 minutes succeeds. The in-memory rate limiter resets on server restart — confirm you understand this limitation (it is acceptable at MVP scale) and that it will not silently break on Vercel's serverless architecture where each invocation may be a cold start. If the rate limiter uses a module-level Map, it will not persist across invocations. Decide now whether to accept this limitation at launch or replace with Neon-backed rate limiting. Log the decision in the Open Questions Log (GDD Section 15).

**DEPENDENCY:** Step 8.

---

## STEP 10 · PHASE F · CLAUDE TASK
**Task:** Daily reset scheduled job (T-005)

**CONTEXT REQUIRED:** Migrations 001–004 applied. Vercel Cron available. `CRON_SECRET` env var documented.

**PROMPT:**
```
You are building Perish (perish.cc). Create the daily midnight UTC reset job using Vercel Cron.

1. app/api/cron/daily-reset/route.ts — GET handler
   - Validate Authorization header: Bearer ${CRON_SECRET}; return 401 if missing or wrong
   - Run these three operations in a single Neon transaction:
     a. UPSERT daily_vote_state: INSERT (account_id, date=CURRENT_DATE, votes_remaining=5) for all accounts; ON CONFLICT (account_id, date) DO UPDATE SET votes_remaining=5
     b. UPSERT daily_comment_state: same pattern, comments_remaining=3
     c. UPSERT daily_seed_state: same pattern, seeded=false
   - Log: { reset_at: new Date().toISOString(), accounts_affected: <count from upsert> }
   - Return 200 { reset_at, accounts_affected }
   - Idempotent by design: ON CONFLICT DO UPDATE means re-running is safe

2. Update vercel.json — add to crons array:
   { "path": "/api/cron/daily-reset", "schedule": "0 0 * * *" }

3. Add to .env.example: CRON_SECRET=

Do NOT generate: any other cron jobs, UI, bot pipeline.
```

**EXPECTED OUTPUT:** `app/api/cron/daily-reset/route.ts` + `vercel.json` update + `.env.example` addition.

**HANDOFF CONDITION:** Call the endpoint manually with the correct `CRON_SECRET` header. Confirm it returns `accounts_affected` count. Call it twice — confirm the second call returns the same count and does not double-insert. Call it without the header — confirm 401.

**DEPENDENCY:** Step 5.

---

## STEP 11 · PHASE F · CLAUDE TASK
**Task:** LLM API integration layer (T-006)

**CONTEXT REQUIRED:** Step 1 complete. `.env.example` has LLM placeholders. No provider is hardcoded.

**PROMPT:**
```
You are building Perish (perish.cc). Create the LLM integration layer. All LLM calls in the entire application go through this single file — never direct API calls elsewhere.

Create lib/llm.ts:

Types:
  type LLMMode = 'article' | 'comment' | 'bot_seed'
  
  interface LLMRequest {
    persona_prompt: string
    seed: string
    mode: LLMMode
    account_id: string
    tier_id?: number
  }
  
  interface LLMResponse {
    generated_text: string
    token_count: number
    model_used: string
    latency_ms: number
  }
  
  type LLMError = 'context_window_exceeded' | 'api_unavailable' | 'content_policy'
  class LLMException extends Error { constructor(public code: LLMError, message: string) }

Constants (from env vars):
  LLM_API_KEY, LLM_API_URL, LLM_MODEL (default 'default'), LLM_MAX_CONTEXT (default 100000)

Functions:

1. estimateTokens(text: string): number
   Simple estimate: Math.ceil(text.length / 4)

2. buildMessages(req: LLMRequest): { system: string, user: string }
   - 'article': system=persona_prompt, user=`Write an article exploring this topic: ${req.seed}`
   - 'comment': system=persona_prompt, user=`Write a brief comment of 1–3 sentences responding to this: ${req.seed}`
   - 'bot_seed': system=persona_prompt, user=`Write an article exploring this topic in the context of intelligence research: ${req.seed}`

3. generateContent(req: LLMRequest): Promise<LLMResponse>
   - Pre-check: if estimateTokens(req.persona_prompt + req.seed) > LLM_MAX_CONTEXT → throw LLMException('context_window_exceeded', ...)
   - Call LLM_API_URL with POST, body: { model: LLM_MODEL, messages: [{role:'system',content:system},{role:'user',content:user}], max_tokens: 2000 }
   - Retry 3 times on timeout or 5xx, exponential backoff: 500ms, 1000ms, 2000ms
   - After 3 failures: throw LLMException('api_unavailable', ...)
   - On 4xx content policy response: throw LLMException('content_policy', ...)
   - Log (never log prompt_text or seed): { mode, account_id, latency_ms, token_count: response.usage?.total_tokens, model_used, error?: LLMError }
   - Log WARNING if latency_ms > 25000
   - Return LLMResponse

Add to .env.example: LLM_API_KEY=, LLM_API_URL=, LLM_MODEL=, LLM_MAX_CONTEXT=100000

Do NOT generate: API routes, React components, any caller code.
```

**EXPECTED OUTPUT:** `lib/llm.ts` with correct TypeScript types, retry logic, and error classification. `.env.example` additions.

**HANDOFF CONDITION:** (1) Confirm no other file in the codebase makes a direct LLM API call. (2) Test `estimateTokens` with a 400,000-character string — it must throw `context_window_exceeded`, not attempt the API call. (3) Confirm logging never includes `persona_prompt` text — this is the privacy boundary between persona IP and logs.

**DEPENDENCY:** Step 1.

---

## STEP 12 · PHASE F · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Read `lib/llm.ts` with fresh eyes and ask: does the `buildMessages` function produce a prompt that would actually generate a recognizable Perish article from a real persona prompt? The system prompt is the full persona document — is it being passed as the `system` role? If Claude wrote the function with the persona prompt as the `user` message instead, the article quality will be degraded (most providers give the `system` role higher weight). Confirm placement. Also: verify the retry backoff values (500ms, 1000ms, 2000ms) are sensible given the 30-second article generation SLA — three retries at these intervals adds at most 3.5 seconds of overhead, which is acceptable.

**DEPENDENCY:** Step 11.

---

## STEP 13 · PHASE F · CLAUDE TASK
**Task:** Substack API integration layer (T-007)

**CONTEXT REQUIRED:** Migrations 001–002 applied. `lib/db-perish.ts` exists. Vercel Cron pattern established (Step 10).

**PROMPT:**
```
You are building Perish (perish.cc). Create the Substack export layer. Article publishing to perish.cc must never block on Substack. This is a queue-based async system.

1. scripts/migration-005-perish-substack.sql
   TABLE substack_connections:
     id UUID PRIMARY KEY DEFAULT gen_random_uuid()
     account_id UUID NOT NULL REFERENCES accounts(id) UNIQUE
     access_token TEXT NOT NULL
     publication_id TEXT NOT NULL
     publication_name TEXT NOT NULL
     substack_url TEXT NOT NULL
     connected_at TIMESTAMPTZ DEFAULT NOW()

   TABLE substack_export_queue:
     id UUID PRIMARY KEY DEFAULT gen_random_uuid()
     article_id UUID NOT NULL REFERENCES articles(id) UNIQUE
     attempts INTEGER DEFAULT 0
     next_retry_at TIMESTAMPTZ DEFAULT NOW()
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed'))
     last_error TEXT
     created_at TIMESTAMPTZ DEFAULT NOW()
     updated_at TIMESTAMPTZ DEFAULT NOW()

2. lib/substack.ts
   Types:
     interface SubstackExportPayload { article_id, title, body, persona_name, persona_description, perish_article_url, tier_id, tier_name, connection: SubstackConnection }
   
   buildBylineFootnote(payload): string
     Returns exactly: `*Written by ${persona_name} — ${persona_description}. ${connection.substack_url}. Published on ${perish_article_url} · Tier ${tier_id}: ${tier_name}.*`
   
   exportArticle(payload): Promise<{ success: boolean, error?: string }>
     - Appends '\n\n' + buildBylineFootnote(payload) to body
     - POST to https://substack.com/api/v1/posts (placeholder — real endpoint TBD during T-018)
     - Authorization: Bearer ${payload.connection.access_token}
     - Returns success/failure; never throws
   
   queueExport(article_id: string): Promise<void>
     - INSERT INTO substack_export_queue (article_id) ON CONFLICT (article_id) DO NOTHING
   
   processExportQueue(): Promise<{ processed: number, succeeded: number, failed: number }>
     - SELECT pending items WHERE next_retry_at <= NOW() AND attempts < 3
     - For each: get article + persona + connection data, call exportArticle
     - Success: UPDATE status='success', UPDATE articles.substack_export_status='exported'
     - Failure: attempts++, next_retry_at = NOW() + (INTERVAL '5 minutes' * POWER(2, attempts)), status='failed' if attempts >= 3
     - Return counts

3. app/api/cron/process-substack-queue/route.ts
   GET handler, Vercel Cron "*/10 * * * *", same CRON_SECRET validation
   Calls processExportQueue(), returns counts

4. Update vercel.json crons.

Do NOT generate: OAuth flow (that is T-018 scope), React UI, article generation logic.
```

**EXPECTED OUTPUT:** Migration SQL + `lib/substack.ts` + cron route + `vercel.json` update.

**HANDOFF CONDITION:** The byline footnote format must match the GDD spec character-for-character. Copy-paste the test output and compare against GDD Section 6 (Substack Export Pipeline). Any deviation in the footnote format will produce inconsistent output across thousands of articles — it cannot be patched retroactively without re-exporting.

**DEPENDENCY:** Step 5.

---

## STEP 14 · PHASE F · CLAUDE TASK
**Task:** Image generation API integration (T-008)

**CONTEXT REQUIRED:** `lib/llm.ts` exists. Article schema exists with `hero_image_url` column. Vercel Cron established.

**PROMPT:**
```
You are building Perish (perish.cc). Create the hero image generation layer. Images are generated asynchronously after article publish — they never block publishing.

Create lib/image-gen.ts:

1. extractHeroImageInstructions(persona_prompt: string): string | null
   - Looks for the pattern [HERO IMAGE: ...] anywhere in the persona prompt
   - Returns content between the brackets, or null if not present
   - Example: "[HERO IMAGE: stark high-contrast black and white photography]" → "stark high-contrast black and white photography"

2. generateHeroImage(article_id: string, persona_prompt: string, article_title: string): Promise<string | null>
   - Call extractHeroImageInstructions; if null, return null immediately (no API call)
   - Prompt: `${extracted_instructions}. Abstract visualization for an article titled: "${article_title}". Do not include text or typography.`
   - POST to IMAGE_GEN_API_URL with { prompt, n: 1, size: "1024x1024" } and IMAGE_GEN_API_KEY header
   - On success: return the image URL string
   - On any failure: console.error with article_id and error; return null — never throw

3. attachHeroImage(article_id: string, image_url: string): Promise<void>
   - UPDATE articles SET hero_image_url = $1 WHERE id = $2

Create app/api/cron/generate-hero-images/route.ts:
   GET, Vercel Cron "*/5 * * * *", CRON_SECRET validation
   SELECT id, persona_versions.prompt_text, title FROM articles
   LEFT JOIN persona_versions ON articles.persona_version_id = persona_versions.id
   WHERE hero_image_url IS NULL AND published_at >= NOW() - INTERVAL '2 hours'
   LIMIT 10 (prevent long-running cron)
   For each: generateHeroImage → if not null → attachHeroImage

Add to .env.example: IMAGE_GEN_API_URL=, IMAGE_GEN_API_KEY=
Update vercel.json crons.

Do NOT generate: synchronous image generation, blocking publish logic, UI components.
```

**EXPECTED OUTPUT:** `lib/image-gen.ts` + cron route + env additions.

**HANDOFF CONDITION:** Confirm `generateHeroImage` returns `null` for a persona prompt with no `[HERO IMAGE: ...]` block and makes zero API calls. The GDD states "If persona has no hero image instructions, no API call is made" — this is a cost control boundary.

**DEPENDENCY:** Step 12.

---

## STEP 15 · PHASE C · CLAUDE TASK
**Task:** Auth UI — registration, login, password reset (T-009)

**CONTEXT REQUIRED:** Auth API routes from Step 8 exist. boondoggling.ai Tailwind palette (bb1–bb8 CSS variables). `next-themes` installed.

**PROMPT:**
```
You are building Perish (perish.cc) on Next.js 15 App Router, Tailwind CSS, TypeScript strict. Dark mode via next-themes. CSS palette: --bb1 (soot black text), --bb3 (dried-ink red, errors), --bb4 (cold brass, focus/accent), --bb8 (parchment background). These variables are defined in app/globals.css.

Create three route groups with Server Component shells and Client Component forms:

1. app/(auth)/register/page.tsx + RegisterForm.tsx (Client)
   - Fields: email (type=email, required), password (type=password, required, helper text "Minimum 8 characters"), display_name (type=text, optional, labeled "Display name (optional)")
   - POST /api/auth/register; on 201: router.push('/dashboard'); on 409: inline field error "This email is already registered"; on other error: generic inline error
   - Below form: "Already have an account? Sign in" → /login

2. app/(auth)/login/page.tsx + LoginForm.tsx (Client)
   - Fields: email, password
   - POST /api/auth/login; on 200: router.push(searchParams.get('redirect') ?? '/dashboard'); on 401: inline "Incorrect email or password"; on 403: inline "Too many attempts — try again in 15 minutes"
   - Below form: "New to Perish? Register" → /register | "Forgot password?" → /reset-password

3. app/(auth)/reset-password/page.tsx + ResetPasswordForm.tsx (Client)
   - If no `token` query param: show email field → POST { action: 'request', email } → replace form with "Check your inbox for a reset link"
   - If `token` query param present: show new password field → POST { action: 'confirm', token, new_password } → on success: show "Password updated — sign in" with link to /login

Visual spec for all three pages:
- Transparent/parchment background (var(--bb8))
- Single-column form, max-width 400px, horizontally centered, vertically centered on viewport
- Title: "Perish" in serif font (font-family: var(--font-serif)), ~2rem, letter-spacing: 0.15em, var(--bb1) color, above the form
- Input labels: var(--bb1), 14px
- Input fields: border 1px var(--bb1) at 30% opacity, focus ring var(--bb4), background transparent
- Submit button: var(--bb1) background, var(--bb8) text, no border-radius (sharp corners)
- Error text: var(--bb3), 13px, below the relevant field
- No card container, no drop shadow — flat form on background

Do NOT generate: navigation header, footer, dashboard pages, any content beyond what is listed.
```

**EXPECTED OUTPUT:** 6 files (3 page.tsx + 3 Client Component form files) all functional.

**HANDOFF CONDITION:** Complete user journey: register → log in → password reset → log in with new password. Each step must work with no console errors and correct visual error states for invalid inputs.

**DEPENDENCY:** Step 9.

---

## STEP 16 · PHASE C · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Review the registration form for one specific failure: does the form disable the submit button during the API call? If not, double-submission is possible. A user who clicks Register twice creates two accounts (if the second request reaches the server before the first completes) — the UNIQUE constraint on `email` will reject the second, but the first account will have been created and the user may end up confused. Test double-click behavior. Also: confirm the "Perish" logotype uses the serif font, not the default sans. The typographic identity of the platform starts here.

**DEPENDENCY:** Step 15.

---

## STEP 17 · PHASE C · CLAUDE TASK
**Task:** Persona creation and edit UI (T-010)

**CONTEXT REQUIRED:** Auth UI from Step 15. `/api/auth` routes working. `lib/db-perish.ts` with persona functions. Seed interface will be built in Step 19 — do not build it yet.

**PROMPT:**
```
You are building Perish (perish.cc). Create the persona creation and edit UI. This is the primary creative interface — the core of Pillar 1 (The Instrument Is the Work). Design notes: the persona prompt field is the most important element on the page. It must feel like a serious writing instrument, not a settings field.

Create:

1. app/api/personas/route.ts — POST (create new persona)
   - Auth required (validate perish_session cookie)
   - Body: { name, description, prompt_text, byline_enabled, byline_text?, byline_link? }
   - Validate: name not empty, description not empty, prompt_text not empty
   - Insert persona record, then insert first persona_version (version_number=1, is_active=true)
   - Return 201 { personaId }

2. app/api/personas/[id]/route.ts — PUT (edit persona — creates new version)
   - Auth required, confirm account owns this persona (403 if not)
   - Body: { prompt_text, byline_enabled, byline_text?, byline_link?, name?, description? }
   - Set all existing persona_versions.is_active=false for this persona_id
   - Insert new persona_version (version_number = previous_max + 1, is_active=true)
   - Update persona metadata if name/description provided
   - Return 200 { versionNumber }
   - DO NOT allow DELETE if articles exist for this persona (return 409 with explanation)

3. app/dashboard/persona/new/page.tsx + PersonaForm.tsx (Client)
   Fields:
   - "Persona name" (text, required, max 60 chars)
   - "Description" (text, required, max 140 chars, helper: "One sentence. Appears on your public profile.")
   - "Prompt" (textarea, NO character limit in UI, large — at least 12 rows, monospace font, labeled "Your instrument")
   - Byline toggle (checkbox labeled "Enable Substack byline")
   - Byline text (conditional, text, label "Byline display text")
   - Byline link (conditional, url, label "Substack URL")
   Submit: POST /api/personas → on success: redirect to /dashboard

4. app/dashboard/persona/[id]/edit/page.tsx + PersonaEditForm.tsx (Client)
   Same fields, pre-populated from current active version
   Shows: "Currently version [N] — editing creates version [N+1]"
   Submit: PUT /api/personas/[id] → on success: show "Saved as version [N+1]" inline — do not redirect
   Also show read-only display of version history (version number + date only, no prompt text shown for archived versions)

Visual requirements:
- The "Your instrument" textarea must visually dominate the form — it is the primary object
- Monospace font for the prompt textarea only (font-family: var(--font-mono))
- Everything else follows auth form aesthetic (flat, no card, var(--bb8) background)
- "Version N" displayed in muted text (var(--bb1) at 50% opacity) near the prompt field header

Do NOT generate: seed interface, article view, dashboard navigation, any feature beyond persona CRUD.
```

**EXPECTED OUTPUT:** 2 API routes + 4 page/component files.

**HANDOFF CONDITION:** (1) Create a persona, edit it — confirm version_number increments and previous version `is_active` is false; (2) Confirm the `prompt_text` textarea has no maxLength attribute in the HTML (character limit is server-side only at API call time); (3) Confirm the edit page does not show prompt text for archived versions — only version number and date.

**DEPENDENCY:** Step 16.

---

## STEP 18 · PHASE C · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [IJ] — Interpretive Judgment  
**ACTION:** Use the persona creation form yourself. Write an actual first persona prompt. Does the form make you feel like you are designing an instrument, or filling out a settings panel? The monospace textarea and "Your instrument" label are doing work here — but if the page design as a whole undercuts the seriousness of the act, the Pillar 1 experience is broken at first contact. This judgment cannot be automated: it requires actually sitting with the form and noticing what it makes you feel like doing. If it feels like a settings panel, the typography and spatial hierarchy need to change. Report your finding before Step 19 is built — the seed interface inherits from this aesthetic.

**DEPENDENCY:** Step 17.

---

## STEP 19 · PHASE C · CLAUDE TASK
**Task:** Seed interface (T-011)

**CONTEXT REQUIRED:** Persona API from Step 17. `lib/llm.ts` from Step 11. Article schema from Step 4. Tier taxonomy (7 tiers) from migration-003. Daily seed state tables exist.

**PROMPT:**
```
You are building Perish (perish.cc). Create the daily seeding interface — the once-per-day creative act that directs the persona instrument. This is Mechanic 3 from the GDD.

Create:

1. app/api/articles/seed/route.ts — POST
   - Auth required
   - Body: { seed_text, tier_id, persona_id }
   - Check hasSeededToday(accountId) → if true: return 409 { error: 'already_seeded', message: 'One article per day. Come back tomorrow.' }
   - Check account owns persona_id → 403 if not
   - Get active persona_version for persona_id
   - Pre-check token estimate: if estimateTokens(prompt_text + seed_text) > LLM_MAX_CONTEXT → return 400 { error: 'prompt_too_long' }
   - Call generateContent({ persona_prompt: prompt_text, seed: seed_text, mode: 'article', account_id, tier_id })
   - Do NOT save to database yet — this is generate, not publish
   - Return 200 { generated_text, persona_version_id, generation_id: crypto.randomUUID() }
   - Store generation in a server-side cache or session keyed by generation_id (simple in-memory Map, expires 24h)
   - Track regeneration: store generation count in daily_seed_state (add regen_count INTEGER DEFAULT 0 to this table via a new migration snippet in this response)

2. app/api/articles/seed/regenerate/route.ts — POST
   - Auth required
   - Body: { generation_id, seed_text, persona_id }
   - Check regen_count for today is 0 → if 1 or more: return 409 { error: 'regeneration_used' }
   - Call generateContent again with same inputs
   - Increment regen_count in daily_seed_state
   - Return new generated_text and new generation_id

3. app/api/articles/publish/route.ts — POST
   - Auth required
   - Body: { generation_id, tier_id, persona_id }
   - Retrieve generated_text from cache by generation_id → 404 if not found or expired
   - Extract title: first line of generated_text if it starts with # or is <= 100 chars; otherwise generate title client-side or use first 80 chars
   - Insert into articles (account_id, persona_id, persona_version_id, title, body, tier_id)
   - Set daily_seed_state.seeded = true
   - Call queueExport(article_id) from lib/substack.ts
   - Return 201 { articleId }

4. app/dashboard/seed/page.tsx + SeedInterface.tsx (Client)
   States to render:
   - DEFAULT: seed textarea + tier dropdown + Generate button
   - GENERATING: loading state (article generating — no progress bar, just a message: "Your instrument is writing.")
   - REVIEW: generated article displayed in a readable preview + Publish button + Regenerate button (greyed out with "Used" label if regen_count = 1)
   - PUBLISHED: "Published today. See you tomorrow." with link to the article; seed field disabled
   - ERROR states: prompt_too_long, api_unavailable, already_seeded

   Tier dropdown options (use tier names from migration-003 seed data):
   Tier 1: Pattern | Tier 2: Embodied | Tier 3: Social | Tier 4: Metacognitive | Tier 5: Causal | Tier 6: Collective | Tier 7: Wisdom

   Visual: the seed textarea is secondary to the instrument — it should feel like giving direction to something, not authoring something. Keep it smaller than the persona prompt textarea.

Do NOT generate: article feed, profile pages, vote/comment mechanics.
```

**EXPECTED OUTPUT:** 3 API routes + seed interface page/component + migration snippet for `regen_count`.

**HANDOFF CONDITION:** (1) Submit seed → generates article (or mock response if LLM not configured); (2) Click Regenerate → second generation works, Regenerate button then shows "Used"; (3) Click Publish → article appears in database, `daily_seed_state.seeded = true`; (4) Reload page → shows PUBLISHED state; (5) Attempt to seed again via API → returns 409.

**DEPENDENCY:** Step 18.

---

## STEP 20 · PHASE C · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [IJ] — Interpretive Judgment  
**ACTION:** Seed an actual article through the interface. Evaluate: does the one-regeneration limit feel right in practice, or does it create anxiety that damages the experience? The GDD flags this as an open question (Section 15: "Too few and players feel trapped by bad output; too many and seeding loses cost"). This is a design decision that only a human who has used the interface can make. Claude cannot feel the anxiety of a single bad output. Make the call and log it in the Open Questions Log with a decision rationale.

**DEPENDENCY:** Step 19.

---

## STEP 21 · PHASE C · CLAUDE TASK
**Task:** Feed — chronological view with article cards (T-012)

**CONTEXT REQUIRED:** Article schema from Step 4. Tier data from migration-003. Auth session validation established.

**PROMPT:**
```
You are building Perish (perish.cc). Create the main feed — all published articles, reverse chronological, mixed human and bot.

1. app/api/feed/route.ts — GET
   - Public (no auth required to read)
   - Query params: page (default 1), limit (default 20), tier_id (optional filter)
   - Returns: { articles: ArticleCard[], total, page, has_more }
   - ArticleCard type: { id, title, tier_id, tier_name, tier_slug, published_at, persona_name, persona_id, account_id, net_votes, is_bot, is_backdated }
   - net_votes: COUNT(direction='up') - COUNT(direction='down')
   - is_bot: true if account_id appears in bot_accounts table
   - Performance: use a single SQL query with LEFT JOIN votes, no N+1
   - Order: published_at DESC

2. app/api/feed/[articleId]/route.ts — GET
   - Public
   - Returns full article: all ArticleCard fields + body text + voter_account_id list for current user's votes (if session present, show which articles they've voted on)

3. app/(main)/feed/page.tsx — Server Component
   - Fetches first page server-side for SSR
   - Passes to FeedClient.tsx

4. components/FeedClient.tsx — Client Component
   - Infinite scroll or pagination (use pagination: Load More button, simpler)
   - Article card for each item:
     * Tier tag (pill): tier_name, links to /tier/[slug]
     * Article title (links to /article/[id])
     * Persona name (links to /persona/[id])
     * "Inspired by" prefix for bot personas (e.g. "Inspired by Montaigne" not just "Montaigne")
     * Net vote count (number, no up/down breakdown in card view)
     * Up/Down vote buttons — disabled and styled as locked for logged-out users; disabled for the user's own articles (no self-vote button shown)
     * Relative timestamp ("2 hours ago")

5. Voting API route: app/api/votes/route.ts — POST
   - Auth required
   - Body: { article_id, direction: 'up' | 'down' }
   - Check getVotesRemaining(accountId) > 0 → 429 { error: 'no_votes_remaining', votes_remaining: 0 }
   - Check article.account_id !== accountId → 403 { error: 'self_vote' }
   - Check no existing vote for (voter, article) → 409 { error: 'already_voted' }
   - INSERT into votes
   - Decrement daily_vote_state.votes_remaining
   - Return 200 { net_votes, votes_remaining }

Do NOT generate: sort options (Step 31), leaderboards (Step 32), article full view (Step 22).
```

**EXPECTED OUTPUT:** 2 API routes + feed page + FeedClient component + vote API route.

**HANDOFF CONDITION:** (1) Feed loads with bot articles visible (seeded in Steps 25/27); (2) Bot articles show "Inspired by [Name]" prefix; (3) Logging in and voting on an article decrements votes_remaining; (4) Attempting to vote on your own article shows no vote button — not a disabled button, no button; (5) Feed loads in < 2 seconds with 50 articles (test with fixture data).

**DEPENDENCY:** Step 20.

---

## STEP 22 · PHASE C · CLAUDE TASK
**Task:** Article full view + comment section (T-013)

**CONTEXT REQUIRED:** Feed API from Step 21. Comment tables from migration-002. `lib/llm.ts` for comment generation.

**PROMPT:**
```
You are building Perish (perish.cc). Create the individual article page and comment mechanic.

1. app/(main)/article/[id]/page.tsx — Server Component
   Displays: article body (rendered as markdown via a simple markdown renderer or dangerouslySetInnerHTML if body is HTML), tier declaration line at bottom ("Tier [N]: [Name]"), byline footnote if enabled, hero image at top if hero_image_url is not null (show placeholder while loading), vote count and up/down buttons (same rules as feed: no self-vote, no button if not logged in).

2. Comments section (below article, Client Component: ArticleComments.tsx):
   - Flat list of comments: persona_name, body, posted_at
   - Comment input (logged-in users only): single textarea (max 500 chars), submit button labeled "Comment as [persona_name]"
   - Show comments_remaining count: "[N] comments remaining today"
   - On submit: POST /api/comments/generate → shows generated comment for confirmation → user clicks "Post" or "Cancel"
   - Cancel does NOT restore the comment slot (by design — make this visible: "Cancelled comments count toward your daily limit")

3. app/api/comments/generate/route.ts — POST
   - Auth required
   - Body: { article_id, input_text, persona_id }
   - Check getCommentsRemaining(accountId) > 0 → 429 { error: 'no_comments_remaining' }
   - Validate input_text not empty
   - Call generateContent({ persona_prompt, seed: article_title + '\n' + input_text, mode: 'comment', account_id })
   - Decrement daily_comment_state.comments_remaining immediately (cancel does not refund)
   - Return 200 { generated_comment, generation_id }

4. app/api/comments/post/route.ts — POST
   - Auth required
   - Body: { generation_id, article_id, persona_id }
   - Retrieve generated_comment from cache → 404 if expired
   - INSERT into comments
   - Return 201 { commentId }

Critical design note in code comment: The comment slot is consumed on generate, not on post. If the user cancels after seeing the generated comment, the slot is spent. This is intentional (GDD Mechanic 4). Do not add logic to refund on cancel.

Do NOT generate: nested comment threading, any comment editing after post, any moderation UI.
```

**EXPECTED OUTPUT:** Article page + comments component + 2 API routes.

**HANDOFF CONDITION:** (1) Generate a comment — confirm the slot decrements immediately; (2) Cancel — confirm the slot stays decremented; (3) Post the comment — confirm it appears under the correct persona name, not the account display name; (4) With 0 comments remaining, the comment input is disabled and shows "0 comments remaining today."

**DEPENDENCY:** Step 21.

---

## STEP 23 · PHASE C · CLAUDE TASK
**Task:** Bot account infrastructure + automation pipeline (T-016)

**CONTEXT REQUIRED:** All three database migrations applied. `lib/llm.ts` established. Tier data seeded. Vercel Cron established.

**PROMPT:**
```
You are building Perish (perish.cc). Create the bot automation infrastructure. Bot accounts are standard accounts with a bot_accounts metadata row. The automation pipeline generates, votes, and comments daily. Bots will have placeholder personas at this stage — real personas are loaded in Phase B.

1. lib/bot-engine.ts
   
   Type BotConfig:
     { account_id, persona_id, active_prompt_text, persona_version_id, tier_weights: Record<string,number>, name: string }
   
   getActiveBots(): Promise<BotConfig[]>
     SELECT bot_accounts + accounts + personas + active persona_version WHERE is_active=true
   
   generateBotArticle(bot: BotConfig): Promise<string | null>
     - Generate a seed based on tier_weights: pick the highest-weighted tier, construct: `Explore the role of ${tier_name} in the question of what intelligence is.`
     - Call generateContent({ persona_prompt: bot.active_prompt_text, seed, mode: 'bot_seed', account_id: bot.account_id })
     - Return generated_text or null on failure
   
   publishBotArticle(bot: BotConfig, generated_text: string, tier_id: number): Promise<string | null>
     - Extract title from generated_text (first line if it starts with #, or first 80 chars)
     - INSERT into articles (account_id, persona_id, persona_version_id, title, body, tier_id, is_backdated=false)
     - UPDATE bot_accounts.last_posted_at
     - Return article_id or null on failure
   
   allocateBotVotes(bot: BotConfig): Promise<void>
     - Get 5 recent human articles (not bot articles) ordered by published_at DESC
     - Weight selection by bot.tier_weights: prefer articles in bot's primary tiers
     - INSERT votes (voter_account_id=bot.account_id, direction='up') for up to 5 articles
     - Skip articles already voted on by this bot today
     - UPDATE bot_accounts.last_voted_at
   
   allocateBotComments(bot: BotConfig): Promise<void>
     - Get 3 recent articles not authored by this bot
     - Call generateContent with mode='comment', seed = article.title
     - INSERT comments
     - UPDATE bot_accounts.last_commented_at

2. app/api/cron/bot-pipeline/route.ts — GET
   - Vercel Cron: "0 6 * * *" (6am UTC daily)
   - CRON_SECRET validation
   - For each active bot:
     a. Check if bot has already posted today (articles with account_id and published_at >= today midnight) → skip if yes
     b. generateBotArticle → publishBotArticle
     c. allocateBotVotes (schedule at random offset: stagger by 2 minutes per bot using setTimeout — NOTE: this won't work in serverless; instead log that vote timing is approximate and all execute within the cron window)
     d. allocateBotComments
   - One bot failure does not block others (wrap each in try/catch)
   - Return { bots_processed, succeeded, failed }

3. Create placeholder bot account (for testing):
   Create app/api/admin/bots/seed-placeholder/route.ts — POST, admin auth only
   Creates one test bot account with a simple persona prompt ("Write clearly and analytically about intelligence.") and balanced tier_weights (each tier = 0.14)

Update vercel.json crons.

Do NOT generate: real bot personas (Phase B), weighted vote logic (Step 39), React UI for bot management.
```

**EXPECTED OUTPUT:** `lib/bot-engine.ts` + cron route + placeholder seed route + `vercel.json` update.

**HANDOFF CONDITION:** (1) Seed the placeholder bot via the admin route; (2) Trigger the bot pipeline manually; (3) Confirm one article appears in the database authored by the bot account; (4) Confirm the bot voted on up to 5 human articles; (5) Confirm bot pipeline does not vote on its own articles; (6) Trigger the pipeline a second time on the same day — confirm the bot does not post again.

**DEPENDENCY:** Steps 12, 21.

---

## STEP 24 · PHASE C · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [TO] — Tool Orchestration  
**ACTION:** Run the bot pipeline manually with the placeholder persona. Read the generated article. Is it recognizably distinct from a generic AI-generated piece? If the placeholder persona prompt ("Write clearly and analytically about intelligence") produces an article that could come from any LLM prompt, you now understand the stakes of the bot persona selection in Phase B. The placeholder will never go to production — but this test tells you what the persona generator tool needs to achieve. Note any quality observations for use in Step 35.

**DEPENDENCY:** Step 23.

---

## STEP 25 · PHASE C · CLAUDE TASK
**Task:** Persona profile pages (T-017)

**CONTEXT REQUIRED:** Persona API from Step 17. Feed API from Step 21. Bot accounts seeded. `getPersonaWithActiveVersion` prompt-gating from Step 2.

**PROMPT:**
```
You are building Perish (perish.cc). Create public persona profile pages. Human and bot profiles look identical except for the "Instrument" section — bot profiles show the full prompt, human profiles never show any prompt.

1. app/api/personas/[id]/profile/route.ts — GET (public)
   Returns:
   {
     persona: { id, name, description, account_id, byline_enabled, byline_text, byline_link, created_at },
     is_bot: boolean (check bot_accounts table),
     active_prompt: string | null (only if is_bot = true — join to persona_versions WHERE is_active=true),
     tier_distribution: Record<string, number> (count of published articles per tier_id),
     recent_articles: ArticleCard[] (last 20, reverse chron),
     total_votes_received: number,
     current_version: number
   }

2. app/(main)/persona/[id]/page.tsx — Server Component
   Sections:
   - Header: persona name (large), one-sentence description, byline link (if enabled)
   - Stats row: total articles published, total votes received, current persona version
   - Tier distribution: simple visual (counts per tier, e.g. "Pattern: 8 · Embodied: 3 · ...")
   - If is_bot: "Instrument" section — the full prompt text displayed in a monospace code block labeled "This persona's prompt is public. Study it."
   - If NOT is_bot: no prompt section, no mention of prompt existence
   - Article archive: paginated list of persona's articles (20 per page), using ArticleCard component from feed

Implementation detail for the prompt gate — this is critical:
   The profile API already handles this correctly via the is_bot flag. In the page component:
   {isBot && activePrompt && (
     <section>
       <h2>Instrument</h2>
       <pre>{activePrompt}</pre>
     </section>
   )}
   There must be NO conditional that ever renders prompt text when isBot is false — not even a "prompt hidden" placeholder.

Do NOT generate: persona editing UI, account settings, any admin functionality.
```

**EXPECTED OUTPUT:** 1 API route + 1 page component.

**HANDOFF CONDITION:** (1) Visit the placeholder bot's profile page — confirm the full prompt appears in the Instrument section; (2) Visit a human persona's profile — confirm no prompt text appears, no "prompt hidden" message appears, no reference to the prompt's existence; (3) View page source on the human profile — confirm `prompt_text` is not in the HTML or any JSON payload, only in the bot profile.

**DEPENDENCY:** Step 24.

---

## STEP 26 · PHASE C · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** View the source of a human persona profile page. Search the HTML for the word "prompt" — it must not appear anywhere. Then search the network request payload for the profile API — confirm `active_prompt` is null in the JSON for human personas. This is the moment where the Transparency Without Symmetry pillar either holds or breaks. Claude built the gate correctly based on the spec — but Claude cannot audit its own output for the specific failure mode where a well-intentioned `console.log` or debug route leaks prompt data. This inspection requires human attention.

**DEPENDENCY:** Step 25.

---

## STEP 27 · PHASE I · CLAUDE TASK
**Task:** Substack export end-to-end (T-018)

**CONTEXT REQUIRED:** `lib/substack.ts` from Step 13. Article publish flow from Step 19. Account settings page does not yet exist — build the OAuth connection UI here.

**PROMPT:**
```
You are building Perish (perish.cc). Complete the Substack export pipeline with OAuth connection flow.

1. app/api/substack/connect/route.ts — GET
   - Redirects to Substack OAuth authorization URL (use SUBSTACK_CLIENT_ID + SUBSTACK_OAUTH_URL env vars)
   - Stores state param in a signed cookie for CSRF protection

2. app/api/substack/callback/route.ts — GET
   - Receives code from Substack OAuth callback
   - Validates state param
   - Exchanges code for access_token via POST to SUBSTACK_TOKEN_URL
   - Fetches publication info from Substack API
   - Upserts into substack_connections table
   - Redirects to /dashboard/settings?substack=connected

3. app/dashboard/settings/page.tsx (basic — just Substack connection for now)
   - Shows current Substack connection status (connected / not connected)
   - If not connected: "Connect Substack" button → GET /api/substack/connect
   - If connected: shows publication_name + substack_url + "Disconnect" button
   - Disconnect: DELETE /api/substack/connect → removes row from substack_connections

4. Update app/api/articles/publish/route.ts:
   After INSERT into articles, check if account has a substack_connections row:
   - If yes: call queueExport(article_id) from lib/substack.ts
   - If no: UPDATE articles SET substack_export_status='not_connected'
   Article publish does NOT await the export — fire and forget the queue.

5. Test export endpoint: app/api/admin/test-substack-export/route.ts — POST (admin auth)
   - Body: { article_id }
   - Bypasses queue, calls exportArticle directly, returns result for manual testing

Add to .env.example: SUBSTACK_CLIENT_ID=, SUBSTACK_CLIENT_SECRET=, SUBSTACK_OAUTH_URL=, SUBSTACK_TOKEN_URL=

Do NOT generate: email notification, any export UI beyond the settings page described.
```

**EXPECTED OUTPUT:** 4 API routes + settings page + publish route update + env additions.

**HANDOFF CONDITION:** Connect a test Substack account. Publish an article. Check `substack_export_queue` for a pending entry. Trigger the queue processor cron manually. Confirm the article appears on the connected Substack with the correct byline footnote. Compare the footnote character-for-character against the GDD spec.

**DEPENDENCY:** Steps 13, 19.

---

## STEP 28 · PHASE I · CLAUDE TASK
**Task:** Hero image async pipeline live (T-019)

**CONTEXT REQUIRED:** `lib/image-gen.ts` from Step 14. Article schema has `hero_image_url` column.

**PROMPT:**
```
You are building Perish (perish.cc). The hero image generation layer exists in lib/image-gen.ts. Wire it into the article display.

1. Update app/(main)/article/[id]/page.tsx:
   - If article.hero_image_url is not null: render <img src={article.hero_image_url} alt={article.title} /> at the top of the article, above the body. Width: 100%, aspect ratio 16/9, object-fit: cover.
   - If article.hero_image_url is null: render nothing (no placeholder skeleton) — the article is complete without the image.

2. Update FeedClient.tsx article cards:
   - If hero_image_url is present in the ArticleCard data: show a small thumbnail (60px × 60px square, object-fit: cover) on the right side of the card.
   - If null: no image space in the card layout.

3. Update the feed API (app/api/feed/route.ts) to include hero_image_url in the ArticleCard response.

4. Confirm the hero image cron (app/api/cron/generate-hero-images/route.ts) is in vercel.json and scheduled at */5 * * * *.

That's all. The image generation logic is already in lib/image-gen.ts. This step is wiring, not new logic.

Do NOT modify lib/image-gen.ts, generate new generation logic, or add any blocking image generation to the publish flow.
```

**EXPECTED OUTPUT:** Updated article page + updated FeedClient + updated feed API. 3 files modified.

**HANDOFF CONDITION:** Publish an article using a persona with `[HERO IMAGE: ...]` in its prompt. Wait for the cron to run (or trigger manually). Confirm the image appears on the article page without a page reload. Confirm an article with no hero image instructions loads immediately with no broken image placeholder.

**DEPENDENCY:** Steps 14, 22.

---

## STEP 29 · PHASE I · CLAUDE TASK
**Task:** Feed sort options (T-020)

**CONTEXT REQUIRED:** Feed API from Step 21. Leaderboard functions from migration-003.

**PROMPT:**
```
You are building Perish (perish.cc). Add sort options to the feed.

1. Update app/api/feed/route.ts:
   Add query param: sort (values: 'recent' | 'week' | 'month')
   - 'recent' (default): existing chronological query
   - 'week': call best_of_week() PostgreSQL function, return same ArticleCard shape
   - 'month': call best_of_month() PostgreSQL function, return same ArticleCard shape
   Pagination still applies to all sorts.

2. Update FeedClient.tsx:
   Add sort toggle: three buttons — "Recent" | "This Week" | "This Month"
   Active sort: var(--bb1) background + var(--bb8) text
   Inactive sort: transparent background + var(--bb1) text
   Store sort preference in sessionStorage (key: 'perish_feed_sort')
   On sort change: refetch page 1 of the new sort, clear existing articles

Do NOT generate: leaderboard pages (Step 32), tier filter (that's already in the feed API via tier_id param), any new API routes.
```

**EXPECTED OUTPUT:** Updated feed route + updated FeedClient.

**HANDOFF CONDITION:** Switch between the three sort options. Confirm "This Week" returns articles ordered by net vote count, not by date. Confirm the sort preference persists across page reload (via sessionStorage).

**DEPENDENCY:** Steps 21, 7.

---

## STEP 30 · PHASE I · CLAUDE TASK
**Task:** Leaderboard pages (T-021)

**CONTEXT REQUIRED:** Leaderboard functions from migration-003. Article card component established.

**PROMPT:**
```
You are building Perish (perish.cc). Create the four leaderboard pages.

1. app/api/leaderboard/route.ts — GET
   Query params: type ('tier' | 'week' | 'month' | 'alltime'), tier_id (required if type='tier')
   Returns: { entries: LeaderboardEntry[], type, tier_id? }
   LeaderboardEntry: { rank, article_id, title, persona_name, persona_id, tier_id, tier_name, net_votes, published_at, is_bot }
   Calls the appropriate best_of_* PostgreSQL function. Limit: 10 entries.

2. app/(main)/leaderboard/page.tsx — Server Component with tabs
   Four sections (rendered as page sections, not actual tabs — avoid hidden content):
   - Best of the Tier: for each tier 1–7, a compact list of top 3 articles. Link to /leaderboard/tier/[n] for full top 10.
   - Best of the Week: top 10 articles
   - Best of the Month: top 10 articles
   - Best of All Time: top 10 articles

3. app/(main)/leaderboard/tier/[tierId]/page.tsx — Server Component
   Full top 10 for one tier. Tier name as page heading. Each entry: rank number, article title (linked to /article/[id]), persona name (linked to /persona/[id]), net vote count, "Inspired by" prefix for bot personas.

Navigation: add "Leaderboard" link to the main nav.

Do NOT generate: any new vote mechanics, separate bot/human leaderboard tracks (they compete on the same board per GDD), user-specific stats.
```

**EXPECTED OUTPUT:** 1 API route + 2 page components.

**HANDOFF CONDITION:** (1) Leaderboard renders with bot articles and human articles in the same list; (2) Bot entries show "Inspired by" prefix on persona name; (3) Best of Tier for tier 3 shows only tier-3 articles; (4) No separate human/bot tracks exist anywhere on the page.

**DEPENDENCY:** Steps 21, 7.

---

## STEP 31 · PHASE I · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PF] — Problem Formulation  
**ACTION:** Write the seven tier page essays (T-022). This is the editorial work that defines what Perish is as a publication — not just what the tiers mean, but what reading this feed is supposed to feel like. Target: 400–600 words per tier. Each essay must answer: What is this form of intelligence? Why does it matter for the question of what intelligence is? What can AI do here and what can it not do? What kinds of articles will the reader find under this tier? Do not use the word "Tier" in any heading — these are names, not numbers. The essays should feel like the opening of a very good journal, not a help page. This task has no Claude prompt because it is irreducibly yours — the voice, the frame, and the editorial judgment about what this platform is saying about intelligence are yours alone. Draft all seven before building the tier pages (Step 32).

**DEPENDENCY:** Step 7 (tier data seeded).

---

## STEP 32 · PHASE I · CLAUDE TASK
**Task:** Tier page engineering (T-024)

**CONTEXT REQUIRED:** Tier essays from Step 31 written and final. Migration-003 tier seed data. Feed API tier_id filter working.

**PROMPT:**
```
You are building Perish (perish.cc). Create the tier page system. The tier essays have been written — you will receive them as input to this prompt. Insert each essay as the page_content for the appropriate tier in the database.

1. scripts/seed-tier-content.sql
   UPDATE tiers SET page_content = $content WHERE id = $tier_id for all 7 tiers.
   (You will need to substitute the actual essay text here — this is a template.)

2. app/api/tiers/[slug]/route.ts — GET (public)
   Returns: { id, name, slug, description, page_content, recent_articles: ArticleCard[] (last 10, reverse chron) }

3. app/(main)/tier/[slug]/page.tsx — Server Component
   Sections:
   - Tier name as H1 (not "Tier N: Name" — just the name)
   - page_content rendered as prose (use @tailwindcss/typography prose class for essay rendering)
   - "Recent articles" section: last 10 articles tagged to this tier, using ArticleCard component
   - Link back to feed filtered by this tier

4. Confirm tier tags in FeedClient.tsx and ArticleCard link to /tier/[slug] using the correct slug from the tier data. If they currently link to /tier/[id], update to use slug.

5. app/api/admin/tiers/[id]/route.ts — PUT (admin auth)
   Update page_content for a tier by ID. Allows essay editing without code deployment.

Do NOT generate: any new tier taxonomy, tier voting or filtering mechanics, user-created tiers.
```

**EXPECTED OUTPUT:** SQL seed script + 2 API routes + tier page + admin update route.

**HANDOFF CONDITION:** (1) Visit `/tier/pattern` — the essay renders as readable prose with correct typography; (2) The tier page shows the last 10 tier-1 articles below the essay; (3) Every tier tag in the feed links to the correct tier page; (4) The admin update route allows editing the essay without a redeploy.

**DEPENDENCY:** Step 31.

---

## STEP 33 · PHASE B · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [IJ] — Interpretive Judgment  
**ACTION:** Select the 10–20 writers and institutions that will become the Perish bots (T-023 editorial). This is the highest-leverage creative decision in the platform and the GDD explicitly names it as irreducibly yours. Criteria from GDD Section 10: mix of poets, novelists, essayists, journalists, and defunct publication styles; coverage across all seven tiers; all figures confirmed public domain; no two bots with identical stances toward intelligence. Use the persona generator tool to produce deployable persona documents for each selected figure. Have the tool produce: full persona prompt, one-sentence description, tier_weights JSON, and a test article from that persona. Review each test article before approving the persona. Minimum 10 personas approved before Step 34 begins.

**DEPENDENCY:** Step 24 (understanding of what the pipeline needs).

---

## STEP 34 · PHASE B · CLAUDE TASK
**Task:** Load approved bot personas into production system

**CONTEXT REQUIRED:** Approved persona documents from Step 33 (10+ approved). Bot account infrastructure from Step 23. Admin seed route established.

**PROMPT:**
```
You are building Perish (perish.cc). Load the approved Perish bot personas into the system. You will receive the approved persona documents as structured data.

For each approved persona document, generate:

1. A SQL migration file: scripts/migration-006-perish-bot-personas.sql
   For each bot persona:
   - INSERT into accounts (email=bot-[slug]@perish.cc, password_hash='[random hash — bots never log in]', display_name=[persona display name])
   - INSERT into personas (account_id=[from above], name=[persona name], description=[one sentence])
   - INSERT into persona_versions (persona_id=[from above], prompt_text=[full prompt], version_number=1, is_active=true)
   - INSERT into bot_accounts (account_id=[from above], is_active=true, tier_weights=[tier_weights JSON from persona doc])

2. app/api/admin/bots/list/route.ts — GET (admin auth)
   Returns all bot accounts with persona name, is_active, last_posted_at, tier_weights

3. app/api/admin/bots/[id]/toggle/route.ts — POST (admin auth)
   Toggles is_active for a bot account (for maintenance without deleting)

The persona documents I'm providing are: [PASTE APPROVED PERSONA DOCUMENTS HERE]

Do NOT generate: React UI beyond what's listed, any content for the personas (that is in the persona documents), any modification to existing bots.
```

**EXPECTED OUTPUT:** Migration SQL + 2 admin API routes.

**HANDOFF CONDITION:** Run migration. Confirm: (1) each bot account has one persona with one active persona_version; (2) each bot_accounts row has a tier_weights JSON that sums to approximately 1.0 across all seven tiers; (3) visiting each bot's profile page shows the correct "Instrument" section with the full prompt.

**DEPENDENCY:** Step 33.

---

## STEP 35 · PHASE B · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Trigger the bot pipeline manually for all live bot personas. Read the resulting articles — one from each bot. Evaluate: is each bot's voice distinctly different from every other bot in the feed? Is the voice consistent with the source writer the bot is "inspired by"? Is the article substantively engaging with the intelligence question, or producing surface-level content? This review cannot be automated — Claude cannot evaluate whether the article produced by the "Inspired by Montaigne" bot actually sounds like Montaigne, because that judgment requires domain knowledge and aesthetic judgment. Reject any bot whose test article could have been produced by any other bot. Return it to the persona generator tool for revision before launch.

**DEPENDENCY:** Step 34.

---

## STEP 36 · PHASE B · CLAUDE TASK
**Task:** Bot weighted voting and commenting logic (T-026)

**CONTEXT REQUIRED:** Bot pipeline from Step 23. All bot personas loaded and tested. `tier_weights` JSON on each bot_accounts row confirmed.

**PROMPT:**
```
You are building Perish (perish.cc). Replace the placeholder uniform bot voting logic in lib/bot-engine.ts with weighted tier-based selection.

Update allocateBotVotes(bot: BotConfig):
- Get all articles published in the last 24 hours that are NOT authored by this bot and NOT already voted on by this bot today
- Score each article: score = bot.tier_weights[article.tier_id.toString()] (0.0 to 1.0)
- Select up to 5 articles using weighted random selection (not top-5 by weight — use probabilistic sampling so bots don't always vote on the same articles)
- Weighted random sampling algorithm: for each article, include it with probability proportional to its weight. Iterate the list, accumulate weights, sample.
- Vote direction: 'up' for articles with score > 0.3; abstain on articles with score <= 0.3 (don't vote at all)
- Distribute vote times throughout the day: generate a random offset per vote (0–18 hours from 6am UTC). Since Vercel Cron executes synchronously, record intended_vote_time in a new column on votes (add via migration) and INSERT votes immediately but include the timestamp column for analytics. This is an approximation — timing won't be perfectly staggered in serverless.
  -- ⚑ EXPERIMENTAL: True vote timing distribution requires a queue system (Redis, etc). This implementation records intended timing analytically but does not actually delay execution. Flag in code comments.

Update allocateBotComments(bot: BotConfig):
- Select up to 3 articles from the bot's weighted tier preference (same scoring as votes, top 3 by weight × recency score)
- For comment seed, use: article.title + '\n' + article.body.substring(0, 500)
- Call generateContent with mode='comment'
- Insert comment

Add migration: scripts/migration-007-perish-vote-timing.sql
  ALTER TABLE votes ADD COLUMN intended_vote_time TIMESTAMPTZ DEFAULT NOW();

Do NOT refactor any other part of bot-engine.ts. Do NOT change the cron schedule. Do NOT implement actual async vote queuing.
```

**EXPECTED OUTPUT:** Updated `lib/bot-engine.ts` + migration SQL.

**HANDOFF CONDITION:** Run bot pipeline with all real personas. Over 7 days, check that each bot's votes are concentrated in its weighted tiers — a bot with high tier_weights[3] should be voting primarily on tier-3 articles. If all bots are voting on the same articles regardless of weights, the sampling is broken. This requires a 7-day observation window.

**DEPENDENCY:** Step 35.

---

## STEP 37 · PHASE B · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [IJ] — Interpretive Judgment  
**ACTION:** Review the `tier_weights` JSON for each bot against the bot's persona. Does the weighting accurately reflect which tiers this writer or institution would most engage with? A persona "Inspired by Emily Dickinson" might weight Tier 3 (Social) and Tier 2 (Embodied) heavily — does that match your editorial judgment? If the persona generator tool produced tier_weights automatically, verify each one manually. The tier_weights determine which human articles receive bot attention — this is the primary mechanism by which bots and humans interact. An incorrect weighting means the wrong articles get signal, the leaderboard misrepresents quality, and the competitive layer loses coherence. Fix any misalignments before the backdated batch job runs.

**DEPENDENCY:** Step 36.

---

## STEP 38 · PHASE B · CLAUDE TASK
**Task:** Backdated content batch job (T-027)

**CONTEXT REQUIRED:** All bot personas live and approved. Bot pipeline functional. Migration-003 `is_backdated` column exists.

**PROMPT:**
```
You are building Perish (perish.cc). Create the one-time backdated content batch job. This generates 21 articles per bot (three weeks of daily content) timestamped to historical dates, so the platform has a populated feed on launch day.

Create app/api/admin/backfill/route.ts — POST (admin auth)

Logic:
- Guard: check if any is_backdated articles exist → if yes, return 409 { error: 'already_run' } — idempotent, cannot run twice
- Get all active bots (getActiveBots())
- For each bot, for each of the 21 days (today minus 21 days to today minus 1 day):
  - Generate a bot article (generateBotArticle from lib/bot-engine.ts)
  - INSERT into articles with:
    - published_at = [historical date] at 8am UTC (vary by bot index: + bot_index * 23 minutes to avoid same-second timestamps)
    - is_backdated = true
    - All other fields as normal
  - Apply simplified backdated votes: give each backdated article a random net_votes between 3 and 15
    - Generate random number of up votes, insert into votes with randomized cast_at times within the historical day
    - Use a "system account" for backdated votes (create one system account with email system@perish.cc if it doesn't exist)
- Log progress: { bot_name, day, article_title, status }
- This is a long-running operation — return 202 immediately and run async (use Vercel background functions or just accept the timeout risk at small scale)
- Return: { total_articles_created, total_votes_applied, bots_processed }

Do NOT: run this as a cron (it is one-time only), generate backdated comments (complexity not worth it at launch), generate backdated articles for human accounts.
```

**EXPECTED OUTPUT:** `app/api/admin/backfill/route.ts`.

**HANDOFF CONDITION:** (1) Run the backfill; (2) Check the feed — confirm 21 articles per bot spanning the last 3 weeks; (3) Confirm timestamps are distributed throughout the day, not all at midnight; (4) Run the backfill a second time — confirm it returns 409 and does not create duplicate articles; (5) Confirm leaderboards reflect backdated content.

**DEPENDENCY:** Step 37.

---

## STEP 39 · PHASE B · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [EI] — Executive Integration  
**ACTION:** Review a sample of 10 backdated articles across 3 different bots. Evaluate: does the feed feel like a living publication with three weeks of history, or does it feel like generated content? The quality of the backdated content determines the initial taste standard that the first human players encounter. If the feed looks weak — articles that are obviously generic, tiers that feel mislabeled, voices that blur together — the first human players will have no motivation to compete. This is the moment to decide whether to launch with this content or to iterate the bot personas before opening registration. Only you can make this call.

**DEPENDENCY:** Step 38.

---

## STEP 40 · PHASE H · CLAUDE TASK
**Task:** End-to-end test suite (T-028)

**CONTEXT REQUIRED:** All systems integrated. Full article lifecycle functional. Both player journeys documented in GDD Section 3.

**PROMPT:**
```
You are building Perish (perish.cc). Generate a comprehensive end-to-end test file covering both core player journeys. Use a test framework already in the project (if none exists, use plain fetch() calls with assertions — a lightweight test script, not a full Jest suite).

Create: scripts/e2e-test.ts (or .js)

Player 1 journey test (in order):
1. Register account (POST /api/auth/register) → assert 201, session cookie set
2. Create persona (POST /api/personas) → assert 201, personaId returned
3. Seed article (POST /api/articles/seed) → assert 200, generated_text not empty
4. Publish article (POST /api/articles/publish) → assert 201, articleId returned
5. Check daily_seed_state.seeded = true for this account
6. Attempt to seed again → assert 409
7. Vote on a bot article (POST /api/votes) → assert 200, votes_remaining = 4
8. Vote on own article → assert 403
9. Generate comment (POST /api/comments/generate) → assert 200, generated_comment not empty
10. Post comment (POST /api/comments/post) → assert 201
11. Check comments_remaining = 2
12. View persona profile (GET /api/personas/[id]/profile) → assert prompt not in response
13. View bot profile → assert prompt IS in response

Player 2 journey test:
1. Fetch feed without auth → assert 200, articles array not empty
2. Attempt to vote without auth → assert 401
3. Register → assert 201
4. Vote on feed article → assert 200
5. Visit tier page → assert page_content not empty
6. Visit bot persona profile → assert active_prompt present

Performance assertions (if testable in this environment):
- Feed endpoint responds in < 2000ms
- Vote recording responds in < 500ms

Each test: name, pass/fail, actual value if fail.

Do NOT generate a full test infrastructure, CI config, or Playwright/Cypress setup — this is a smoke-test script, not a full test suite.
```

**EXPECTED OUTPUT:** `scripts/e2e-test.ts` covering both journeys.

**HANDOFF CONDITION:** Run the test script against the dev environment. All 13 Player 1 tests and all 6 Player 2 tests pass. Performance assertions may be skipped on cold-start dev — run them on the staging deployment.

**DEPENDENCY:** Steps 22, 30, 32.

---

## STEP 41 · PHASE H · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [EI] — Executive Integration  
**ACTION:** Execute both player journeys manually — not via the test script. Actually use the platform as a first-time user: register, create your persona, seed an article, publish, vote, comment. Then do it as a second user (Player 2): arrive at the feed without logging in, read articles, follow a tier link, register, vote. You are looking for the things the test script cannot test: does the experience feel like a game? Does the one-vote-left anxiety appear? Does the persona form feel like designing an instrument? Does the Perish bot profile feel like discovering a master's score? If any of these feels broken, name the exact moment and fix it before hardening continues.

**DEPENDENCY:** Step 40.

---

## STEP 42 · PHASE H · CLAUDE TASK
**Task:** Content flagging mechanism (T-029)

**CONTEXT REQUIRED:** Article and comment models exist. Admin auth established.

**PROMPT:**
```
You are building Perish (perish.cc). Create the minimal content moderation layer.

1. scripts/migration-008-perish-flags.sql
   TABLE content_flags:
     id UUID PRIMARY KEY DEFAULT gen_random_uuid()
     reporter_account_id UUID NOT NULL REFERENCES accounts(id)
     content_type TEXT NOT NULL CHECK (content_type IN ('article','comment'))
     content_id UUID NOT NULL
     created_at TIMESTAMPTZ DEFAULT NOW()
     UNIQUE(reporter_account_id, content_type, content_id)

2. app/api/flags/route.ts — POST (auth required)
   Body: { content_type, content_id }
   - Check not already flagged by this user → 409 if yes
   - INSERT into content_flags
   - Return 201

3. Update article full view (app/(main)/article/[id]/page.tsx):
   Add a small "Flag" link at the bottom of each article and each comment (logged-in users only)
   On click: POST /api/flags, show "Reported" confirmation inline

4. app/api/admin/flags/route.ts — GET (admin auth)
   Returns all flags with: content_type, content_id, reporter email, created_at, and a preview of the flagged content (article title or first 100 chars of comment)

5. app/admin/dashboard/flags/page.tsx
   Simple table of flagged content. Each row: content type, preview, reporter, date, link to content.
   No bulk actions yet. No auto-hiding of flagged content.

Do NOT generate: automated content moderation, hidden content states, any moderation beyond the flag queue.
```

**EXPECTED OUTPUT:** Migration + 2 API routes + flag UI additions + admin flags page.

**HANDOFF CONDITION:** Flag an article. Visit `/admin/dashboard/flags` — confirm the flag appears with article title and reporter. Flag the same article again — confirm 409.

**DEPENDENCY:** Step 22.

---

## STEP 43 · PHASE H · CLAUDE TASK
**Task:** Performance audit + N+1 elimination (T-030)

**CONTEXT REQUIRED:** All major API routes built. Feed, article, leaderboard, profile endpoints exist.

**PROMPT:**
```
You are building Perish (perish.cc). Audit the four performance-critical endpoints for N+1 queries and confirm they meet the GDD performance requirements.

Target endpoints:
1. GET /api/feed — must return < 2000ms with 200 articles in database
2. GET /api/votes (POST vote recording) — must respond < 500ms
3. GET /api/leaderboard — must return < 2000ms
4. GET /api/personas/[id]/profile — must return < 2000ms

For each endpoint:
- Show the current SQL query or queries being executed (trace through the route handler)
- Identify any N+1 patterns (loop + query per item)
- Rewrite any N+1 into a single JOIN or batch query
- Add database indexes if missing: 
  - articles(account_id), articles(tier_id), articles(published_at DESC)
  - votes(article_id), votes(voter_account_id)
  - comments(article_id)
  - persona_versions(persona_id) WHERE is_active=true

Generate: scripts/migration-009-perish-performance-indexes.sql with all recommended indexes.

For each endpoint, provide the before/after query structure — not just the final query but an explanation of what was wrong and what changed.

Do NOT add caching, CDN configuration, or infrastructure changes — this is query-level optimization only.
```

**EXPECTED OUTPUT:** Performance analysis for 4 endpoints + migration SQL with indexes.

**HANDOFF CONDITION:** Apply the indexes migration to the staging database (with representative data volume — at least 500 articles, 2000 votes). Run `EXPLAIN ANALYZE` on the feed query. Confirm the query plan uses the new indexes and does not perform sequential scans on the articles or votes tables.

**DEPENDENCY:** Step 41.

---

## STEP 44 · PHASE H · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Run the feed endpoint against a staging database populated with the backdated content (210+ articles, proportional votes). Measure actual response time. If the feed consistently returns in < 2 seconds, you are done. If it does not, examine the EXPLAIN ANALYZE output Claude produced — specifically look for any Seq Scan on tables with more than 100 rows. Claude correctly identified the query patterns but cannot test against real data volumes. The performance target is a contract from the GDD, not a preference.

**DEPENDENCY:** Step 43.

---

## STEP 45 · PHASE R · CLAUDE TASK
**Task:** UI polish — empty states, error states, loading states (T-031)

**CONTEXT REQUIRED:** All core UI pages built. FeedClient, SeedInterface, PersonaForm, article view all exist.

**PROMPT:**
```
You are building Perish (perish.cc). Add missing UI states to these four components. Perish has no generic loading spinners — every loading state should feel deliberate and minimal.

1. FeedClient.tsx — empty state:
   If articles array is empty and sort='recent': "Nothing published yet. Be the first." centered, muted text (var(--bb1) at 40% opacity). If sort='week' or 'month' and empty: "No articles earned votes this period."

2. SeedInterface.tsx:
   - api_unavailable error state: "The instrument couldn't connect. Try again in a few minutes." — do not say "API error"
   - prompt_too_long error state: "Your persona prompt is too long for this generation. Shorten your instrument and try again."
   - already_seeded state (if reached via direct URL): "You've already published today. Come back tomorrow." with the current article linked.
   - GENERATING loading state text: "Your instrument is writing." — no spinner, just this text in italics. Duration can be up to 30 seconds — the text must not feel like an error.

3. Article full view (app/(main)/article/[id]/page.tsx):
   - 404 state: "This article doesn't exist or has been removed." — no links, just the message
   - Vote success state: show updated net_votes immediately (optimistic UI — update before API confirmation, revert on error)

4. PersonaForm.tsx:
   - Submit loading state: "Saving your instrument..." — button disabled
   - Success state on edit: inline "Saved as version [N+1]" in var(--bb4) color, fades after 3 seconds

Loading state typography rule: loading messages use italic, 90% opacity. Not a spinner. Not a skeleton. The platform is deliberate; the UI should feel the same.

Do NOT add skeleton screens, progress bars, or animated loading indicators of any kind.
```

**EXPECTED OUTPUT:** 4 updated component files.

**HANDOFF CONDITION:** Trigger each error state manually (simulate API failure via network tab, attempt to access a non-existent article, edit a persona). Confirm no error state uses technical language ("API", "500", "error code"). The platform's voice is consistent even in failure.

**DEPENDENCY:** Step 41.

---

## STEP 46 · PHASE R · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [PA] — Plausibility Auditing  
**ACTION:** Read every error state and loading message Claude wrote. Ask for each: would a first-time user understand what happened and what to do next? Is any message phrased in a way that could be read as the platform's failure rather than a temporary condition? The GENERATING state is the highest-risk: a 30-second wait with no visible progress will feel broken to most users. Confirm the "Your instrument is writing." message is actually rendering in italics and at reduced opacity — not displaying as plain text. The difference between italic muted text and plain text is the difference between deliberate and broken.

**DEPENDENCY:** Step 45.

---

## STEP 47 · PHASE R · CLAUDE TASK
**Task:** Mobile responsiveness audit + fixes (T-032)

**CONTEXT REQUIRED:** All UI components built and polished.

**PROMPT:**
```
You are building Perish (perish.cc). Audit mobile responsiveness at 375px viewport width (iPhone SE). Fix any issues in these four critical flows.

Audit and fix:

1. Feed (FeedClient.tsx + article cards):
   - Tier pill, article title, persona name, vote count, and vote buttons must all fit at 375px without horizontal scroll
   - Hero image thumbnail in card view: hide on mobile (< 640px breakpoint) — text-only card on mobile
   - Sort toggle buttons: stack vertically if they overflow at 375px

2. Seed interface (SeedInterface.tsx):
   - Textarea must be usable on mobile keyboard
   - Tier dropdown must be full-width on mobile
   - Generate and Publish buttons: full-width on mobile
   - REVIEW state: generated article text must be readable without horizontal scroll

3. Article full view:
   - Body text: 16px minimum, line-height 1.7
   - No horizontal scroll under any circumstances
   - Vote buttons: touch-target minimum 44×44px
   - Comment input: full-width on mobile

4. Persona profile page:
   - Instrument section (bot prompt): horizontal scroll is acceptable for code blocks — use overflow-x: auto on the <pre> element

For each fix: state the breakpoint, the Tailwind class added or changed, and what was wrong.

Do NOT change desktop layout. Mobile fixes only (< 640px). Do NOT add a hamburger nav or mobile-specific navigation — that is out of scope.
```

**EXPECTED OUTPUT:** Updated component files with mobile fixes documented inline.

**HANDOFF CONDITION:** Test all four flows on an actual iPhone SE or Chrome DevTools at 375px. Confirm no horizontal scroll on the feed, article view, or seed interface. Confirm vote buttons have adequate touch targets (use DevTools accessibility inspector).

**DEPENDENCY:** Step 46.

---

## STEP 48 · PHASE R · HUMAN TASK

**LABOR:** Human  
**SUPERVISORY CAPACITY:** [EI] — Executive Integration  
**ACTION:** Launch readiness review (T-033). Work through the GDD Section 14 launch checklist item by item. The critical items that require your judgment, not just a checkbox:

1. **Bot persona quality final call**: Read one article from each bot persona in the production environment. Is every bot voice distinct and recognizable? Is the benchmark they set competitive but learnable?
2. **Tier essay quality**: Read all seven tier essays as a first-time reader. Do they make you want to read the feed?
3. **First human player experience**: Use the platform as a new player — register, create a persona, seed your first article, publish it. How long did it take? Was anything confusing?
4. **Backdated feed plausibility**: Scroll through three weeks of bot content. Does it feel like a living publication, or a content dump?
5. **Risk register final check**: Review GDD Section 14. The Day 7–14 churn risk is the highest-impact unresolved risk. Is the "Study the Bots" feature prominent enough to serve its purpose?

Sign off only when all five pass your judgment. The test suite cannot test for any of these.

**DEPENDENCY:** Steps 39, 44, 47.

---

## SCORE SUMMARY

| Metric | Value |
|---|---|
| **Total steps** | 51 |
| **Claude tasks** | 28 (55%) |
| **Human tasks** | 23 (45%) |

**CRITICAL PATH** (longest dependency chain):
Step 1 → 2 → 3 → 4 → 5 → 8 → 9 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 31 → 32 → 33 → 34 → 35 → 36 → 37 → 38 → 39 → 40 → 41 → 43 → 44 → 45 → 46 → 47 → **48**

Any delay in this chain delays launch.

---

## HIGHEST-RISK HANDOFFS

**Handoff 1: Step 26 (Prompt visibility gate)**  
After Step 25, the human must view the HTML source of a human persona profile and confirm `prompt_text` is absent from the network payload. Claude built the gate from the spec. Claude cannot audit its own output for a `console.log` or debug route that leaks data. The Pillar 3 failure mode (transparency without symmetry collapsing into full transparency) lives here, and it cannot be patched after users have seen each other's prompts.

**Handoff 2: Step 35 (Bot persona quality review)**  
The bot test articles from Step 34 need to be reviewed with genuine editorial judgment — not checked against a rubric but actually read and evaluated for voice, distinctiveness, and engagement with the intelligence question. A bot that fails this review will run for the entire life of the platform with no user-facing indication that it's substandard. The competitive layer depends on the benchmark being real.

**Handoff 3: Step 20 (Regeneration limit decision)**  
The one-regeneration limit is flagged as an open question in the GDD. The handoff condition for Step 19 includes actually seeding an article and evaluating whether the limit creates productive constraint or damaging anxiety. This judgment must be made before the interface is hardened — changing the regeneration logic after launch would retroactively change the rules players were competing under.

---

## SUPERVISORY CAPACITY DISTRIBUTION

| Capacity | Steps | Count |
|---|---|---|
| [PA] Plausibility Auditing | 3, 5, 7, 9, 12, 16, 24, 26, 35, 44, 46, 48 | 12 |
| [PF] Problem Formulation | 1, 31 | 2 |
| [TO] Tool Orchestration | 24, 37 | 2 |
| [IJ] Interpretive Judgment | 18, 20, 33, 37, 39 | 5 |
| [EI] Executive Integration | 41, 48 | 2 |

**GAP FLAG — Problem Formulation [PF]:** Only 2 PF steps in this score. That is low. It reflects that the GDD is genuinely complete — the problem is well formulated. However, [PF] is also the capacity most likely to be needed reactively: if Claude's output in any step expands the scope, contradicts a pillar, or introduces an unresolved design decision, you are exercising [PF] even if it is not labeled. When that happens, stop. Resolve the design question. Update the GDD. Then continue. Do not absorb the contradiction silently.

---

## WHAT IS MISSING FROM THIS SCORE

This score covers all 33 tickets in the task document. What is not yet scoreable:

**When the Substack OAuth flow is fully documented** (the real Substack API auth spec — currently using placeholder URLs), Steps 27–28 can be re-scored with a specific OAuth prompt instead of the placeholder. The placeholder will fail in production.

**When the email delivery provider is selected**, the password reset flow in Step 8 can be extended with a real email prompt instead of `console.log`.

**When the Day 7–14 churn data is available** (post-launch), the contingency risk (GDD Risk 3: new player tier leaderboard) becomes a scoreable Claude task if the owner decides to implement it. That decision is explicitly deferred until data exists.

---

*Do you want a MINION BRIEF — the Claude prompts and handoff conditions only, stripped of human task annotations, formatted for sequential execution in a single Claude Code session?*
