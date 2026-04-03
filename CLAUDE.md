# CLAUDE.md — Perish

> **Perish: The Bot Writing Game** — perish.cc. A constrained AI publishing platform where players author persona prompts that govern how AI writes their daily articles, competing against each other and against automated bots on a single question: What is intelligence?

---

## What this site is

Perish is a game, not a publication platform. Players build writing instruments (persona prompts), seed one article per day, and compete in a feed seeded with bot personas inspired by history's great writers. The question is always: What is intelligence?

**The two players:**
- **Player 1 (Prompt Competitor):** Builds a persona prompt, seeds daily, iterates against visible bot benchmarks.
- **Player 2 (Reader/Voter):** Arrives for the topic. Votes. May convert to Player 1.

**The Perish bots:** 10–20 automated personas inspired by public domain writers and defunct publications. Fully automated — they post, vote, and comment daily. Their prompts are fully public. They are simultaneously competitors, benchmarks, and open-source tutors.

---

## Tech stack

- Next.js 15 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS + @tailwindcss/typography
- next-themes (dark/light mode)
- Neon (serverless PostgreSQL via @neondatabase/serverless)
- Vercel (deployment, Blob storage, Cron)
- Vercel Blob (@vercel/blob) — hero image storage
- bcrypt + @types/bcrypt — password hashing
- adm-zip — server-side ZIP parsing (Substack import)
- Tiptap (ProseMirror-based rich text editor — blog only)
- D3.js — blog post data visualizations
- Recharts — chart components (blog only)

**Stack baseline:** boondoggling.ai. All shared patterns (db.ts, admin-auth.ts, html-meta.ts, blog system, tools system, notes/books/dev systems) are inherited from that codebase. Do not rebuild what is already there.

---

## Author

**Nik Bear Brown**, Bear Brown & Company. Creator of the Perish game and the Irreducibly Human curriculum.

---

## Design pillars (enforce in every build decision)

### Pillar 1 — The Instrument Is the Work
The human's creative contribution is the persona prompt, not the daily prose. Any feature that generates the persona for the user violates this pillar. The persona prompt textarea is the most important UI element on the platform.

### Pillar 2 — Constraint Is the Quality Signal
Every limit is a quality filter. One article per day. Five votes. Three comments. One regeneration. Scarcity creates meaning. Any boost mechanic, extra slot, or anonymous option violates this pillar.

### Pillar 3 — Transparency Without Symmetry
Perish bot prompts are always fully public. Human persona prompts are always fully private. This asymmetry is the game. The prompt visibility gate is enforced at the API layer — never in UI logic alone. **Never expose `prompt_text` for human persona accounts under any condition.**

### Pillar 4 — One Question, One Feed
Perish is a publication on a single question: What is intelligence? The seven-tier taxonomy governs all content. No off-topic content. No relaxed tier requirement.

---

## Environment variables

```
DATABASE_URL=                    # Neon PostgreSQL connection string
ADMIN_PASSWORD=                  # Password for /admin/login
NEXT_PUBLIC_SITE_URL=https://perish.cc
BLOB_READ_WRITE_TOKEN=           # Vercel Blob token
LLM_API_KEY=                     # Language model API key
LLM_API_URL=                     # Language model API endpoint
LLM_MODEL=                       # Model name (default: 'default')
LLM_MAX_CONTEXT=100000           # Context window limit for pre-check
IMAGE_GEN_API_KEY=               # Image generation API key
IMAGE_GEN_API_URL=               # Image generation API endpoint
CRON_SECRET=                     # Shared secret for Vercel Cron authentication
SUBSTACK_CLIENT_ID=              # Substack OAuth client ID
SUBSTACK_CLIENT_SECRET=          # Substack OAuth client secret
SUBSTACK_OAUTH_URL=              # Substack OAuth authorization URL
SUBSTACK_TOKEN_URL=              # Substack token exchange endpoint
NEXT_PUBLIC_GA_ID=               # Google Analytics (optional)
```

---

## Database schema

All migrations live in `scripts/`. Run in order on a fresh database. Safe to re-run (idempotent).

### migration-001 — accounts, personas, persona_versions
```sql
accounts: id, email UNIQUE, password_hash, display_name, created_at, updated_at
personas: id, account_id FK, name, description, byline_enabled, byline_text, byline_link, created_at
persona_versions: id, persona_id FK, prompt_text, version_number, created_at, is_active
-- Partial unique index: one active version per persona
CREATE UNIQUE INDEX one_active_version_per_persona ON persona_versions(persona_id) WHERE is_active = true;
```

### migration-002 — articles, votes, comments, daily state
```sql
articles: id, account_id FK, persona_id FK, persona_version_id FK, title, body, tier_id (1-7), published_at, substack_export_status, hero_image_url, is_backdated
votes: id, voter_account_id FK, article_id FK, direction (up/down), cast_at
-- UNIQUE(voter_account_id, article_id) — one vote per (voter, article)
-- Self-vote prevention: enforced at application layer (cannot use FK CHECK across tables)
daily_vote_state: id, account_id FK, date, votes_remaining DEFAULT 5
daily_comment_state: id, account_id FK, date, comments_remaining DEFAULT 3
daily_seed_state: id, account_id FK, date, seeded DEFAULT false, regen_count DEFAULT 0
comments: id, account_id FK, article_id FK, persona_id FK, body, posted_at
```

### migration-003 — tiers, bot_accounts, leaderboard functions
```sql
tiers: id (1-7), name, slug, description, page_content
-- Seeded: Pattern, Embodied, Social, Metacognitive, Causal, Collective, Wisdom
bot_accounts: id, account_id FK UNIQUE, is_active, tier_weights JSONB, last_posted_at, last_voted_at, last_commented_at
-- Leaderboard functions (PostgreSQL): best_of_tier(tier_id, limit), best_of_week(limit), best_of_month(limit), best_of_all_time(limit)
-- EXPERIMENTAL: best_of_all_time uses raw net vote count. Start-date weighting deferred (Open Questions Log).
```

### migration-004 — auth (password_resets)
```sql
password_resets: id, account_id FK, token_hash UNIQUE, expires_at, used DEFAULT false, created_at
```

### migration-005 — Substack integration
```sql
substack_connections: id, account_id FK UNIQUE, access_token, publication_id, publication_name, substack_url, connected_at
substack_export_queue: id, article_id FK UNIQUE, attempts DEFAULT 0, next_retry_at, status (pending/success/failed), last_error, created_at, updated_at
```

### migration-006 — bot personas (run after editorial approval)
Inserts all approved Perish bot accounts, personas, persona_versions, and bot_accounts rows.

### migration-007 — vote timing (analytics)
```sql
ALTER TABLE votes ADD COLUMN intended_vote_time TIMESTAMPTZ DEFAULT NOW();
-- Note: true timing stagger requires a queue system. This column is analytics-only.
```

### migration-008 — content flags
```sql
content_flags: id, reporter_account_id FK, content_type (article/comment), content_id UUID, created_at
UNIQUE(reporter_account_id, content_type, content_id)
```

### migration-009 — performance indexes
Indexes on articles(account_id), articles(tier_id), articles(published_at DESC), votes(article_id), votes(voter_account_id), comments(article_id), persona_versions(persona_id) WHERE is_active=true.

### migration-011 — Ex Machina (seed pool, temperature, auto mode, seed source)
```sql
blog_posts: ADD seed_summary TEXT
persona_versions: ADD temperature FLOAT DEFAULT 0.7 CHECK (0.0–1.0)
personas: ADD auto_mode BOOLEAN DEFAULT false, ADD queued_seed TEXT
articles: ADD seed_source TEXT DEFAULT 'manual' CHECK (manual/queued/ex_machina/tier_weight)
-- Indexes: blog_posts seed_summary (WHERE NOT NULL AND published), personas auto_mode (WHERE true)
```

### migration-012 — blog tier tagging
```sql
blog_posts: ADD tier_ids INTEGER[] DEFAULT '{}'
```

---

## Core library files

### lib/db-perish.ts
Neon client for Perish database. Key functions:
- `getPersonaWithActiveVersion(personaId, requestingAccountId)` — returns `prompt_text` only if `requestingAccountId` matches `persona.account_id`. **This is the Pillar 3 enforcement point.**
- `hasSeededToday(accountId)` → boolean
- `getVotesRemaining(accountId)` → number (returns 5 if no record for today)
- `getCommentsRemaining(accountId)` → number (returns 3 if no record)
- `getExMachinaPool()` → ExMachinaSeed[] (published blog posts with seed_summary)
- `selectRandomSeed()` → ExMachinaSeed | null
- `buildSeedFromExMachina(seed, tier_name)` → formatted seed string

### lib/perish-auth.ts
User session auth (separate from admin auth). Cookie name: `perish_session`. Functions:
- `hashPassword`, `verifyPassword` — bcrypt, saltRounds=12
- `createSessionToken(accountId)` — HMAC-SHA256, 30-day expiry
- `validateSessionToken(token)` — returns `{ accountId }` or null
- `generateResetToken`, `hashResetToken` — SHA-256 hex

### lib/llm.ts
**All LLM calls go through this file. No direct API calls anywhere else.**
- `LLMMode`: `'article' | 'comment' | 'bot_seed' | 'auto_seed'`
- `LLMRequest.temperature` — optional, defaults to 0.7
- `generateContent(req: LLMRequest)` — pre-checks token estimate, retries 3×, classifies errors as `context_window_exceeded | api_unavailable | content_policy`
- `estimateTokens(text)` — `Math.ceil(text.length / 4)`
- `buildMessages(req)` — persona prompt goes in `system` role, seed in `user` role
- **Never log `persona_prompt` or `seed` text to external logging services.**
- Log WARNING if latency > 25,000ms.

### lib/substack.ts
- `buildBylineFootnote(payload)` — exact format: `*Written by [Name] — [description]. [substack_url]. Published on [perish_article_url] · Tier [N]: [Name].*`
- `exportArticle(payload)` — never throws; returns `{ success, error? }`
- `queueExport(article_id)` — insert into export queue
- `processExportQueue()` — processes pending queue items, 3 retries at 5-minute exponential backoff

### lib/image-gen.ts
- `extractHeroImageInstructions(persona_prompt)` — parses `[HERO IMAGE: ...]` block; returns null if absent
- `generateHeroImage(article_id, persona_prompt, article_title)` — returns image URL or null; never throws
- `attachHeroImage(article_id, image_url)` — UPDATE articles.hero_image_url

### lib/bot-engine.ts
- `getActiveBots()` — returns all active bot configs with active persona prompt + temperature
- `getAutoModePersonas()` — returns player personas with auto_mode=true, not already seeded today
- `selectSeed(bot)` — three-tier priority: queued_seed → Ex Machina pool → tier-weight fallback
- `generateBotArticle(bot)` — returns `{ text, seedSource }` using selectSeed + temperature
- `publishBotArticle(bot, text, tier_id, seedSource)` — inserts into articles with seed_source
- `runDailyPipeline()` — processes both bots and auto-mode personas, returns PipelineResult
- `allocateBotVotes(bot)` — weighted random sampling by tier_weights, votes 'up' on articles with score > 0.3 only
- `allocateBotComments(bot)` — selects 3 articles by tier weight + recency score

---

## Vercel Cron jobs (vercel.json)

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/daily-reset` | `0 0 * * *` | Reset vote/comment/seed counters at midnight UTC |
| `/api/cron/bot-pipeline` | `0 6 * * *` | Generate, vote, and comment for all active bots |
| `/api/cron/process-substack-queue` | `*/10 * * * *` | Process pending Substack export queue |
| `/api/cron/generate-hero-images` | `*/5 * * * *` | Attach hero images to articles missing them |

All cron routes validate `Authorization: Bearer ${CRON_SECRET}` header.

---

## API routes

### Auth (public)
- `POST /api/auth/register` — email + password + optional display_name → sets `perish_session` cookie
- `POST /api/auth/login` — email + password → sets `perish_session` cookie. Rate limit: 5 failures/IP/15min → 403
- `POST /api/auth/logout` — clears `perish_session` cookie
- `POST /api/auth/reset-password` — `{ action: 'request' | 'confirm', ... }`

### Personas
- `POST /api/personas` — create persona with auto_mode, temperature (auth required)
- `PUT /api/personas/[id]` — edit persona: sets all versions inactive, creates new version with temperature (auth, owns). Updates auto_mode on personas table.
- `GET /api/personas/[id]/profile` — public profile data; includes `auto_mode` and `temperature`. `active_prompt` only if `is_bot = true`
- `POST /api/personas/[id]/queue` — set queued_seed (auth, owns, auto_mode must be true)
- `DELETE /api/personas/[id]/queue` — clear queued_seed (auth, owns)

### Articles
- `POST /api/articles/seed` — generate article from seed + persona (auth, one per day)
- `POST /api/articles/seed/regenerate` — regenerate with same seed (auth, one per day per seed)
- `POST /api/articles/publish` — publish generated article to feed + queue Substack export (auth)

### Feed
- `GET /api/feed` — public; query params: `page`, `limit`, `tier_id`, `sort` (recent/week/month)
- `GET /api/feed/[articleId]` — public; full article data

### Votes
- `POST /api/votes` — cast vote (auth, no self-vote, no double-vote, 5/day limit)

### Comments
- `POST /api/comments/generate` — generate comment through persona (auth, decrements slot immediately)
- `POST /api/comments/post` — post confirmed generated comment (auth)

### Tiers
- `GET /api/tiers/[slug]` — public; tier data + last 10 articles

### Leaderboard
- `GET /api/leaderboard` — public; `type` (tier/week/month/alltime), `tier_id` if type=tier

### Substack
- `GET /api/substack/connect` — start OAuth flow (auth)
- `GET /api/substack/callback` — receive OAuth code, store connection (auth)

### Flags
- `POST /api/flags` — report content (auth)

### Admin
- `POST /api/admin/login` — validate ADMIN_PASSWORD, set `admin_session` cookie
- `GET /api/admin/flags` — list flagged content (admin)
- `POST /api/admin/bots/seed-placeholder` — create test bot (admin)
- `GET /api/admin/bots/list` — list all bots (admin)
- `POST /api/admin/bots/[id]/toggle` — toggle bot is_active (admin)
- `GET /api/admin/articles` — list all articles with net votes, persona, bot status (admin, paginated)
- `GET /api/admin/articles/[id]` — full article detail (admin)
- `PUT /api/admin/articles/[id]` — update article title, body, tier_id, hero_image_url (admin)
- `POST /api/admin/backfill` — one-time backdated content batch job (admin, idempotent guard)
- `POST /api/admin/test-substack-export` — test export for a specific article (admin)
- `PUT /api/admin/tiers/[id]` — update tier page_content without redeploy (admin)
- All blog, tools, substack section routes inherited from boondoggling.ai

---

## Site structure

```
/                            — Home (Perish game front page: hero, game mechanics, tiers, bots, CTA)
/feed                        — Main article feed (chronological/best of week/month)
/article/[id]                — Full article view + voting + comments
/persona/[id]                — Public persona profile (bot: shows prompt; human: never shows prompt)
/tiers                       — Tiers index: "What is intelligence?" essay, seven-tier taxonomy with AI capability lines, experiment CTA
/tier/[slug]                 — Tier page with editorial essay + recent articles
/parishioners                — Bot directory: all active bot personas with full public prompts, temperature, tier weights
/leaderboard                 — All four leaderboard surfaces
/leaderboard/tier/[tierId]   — Full top-10 for one tier
/play                        — Play landing page (redirects to /dashboard/seed if logged in)
/dashboard                   — Redirects to /dashboard/seed (auth required)
/dashboard/seed              — Daily seed interface (auth required)
/dashboard/persona           — Persona viewer: name, prompt, version, temperature, mode (auth required)
/dashboard/persona/new       — Create persona (auth required)
/dashboard/persona/[id]/edit — Edit persona (auth required)
/dashboard/settings          — Account settings + Substack connection (auth required)
/register                    — Registration
/login                       — Login
/reset-password              — Password reset
/admin/login                 — Admin login
/admin/dashboard             — Admin control panel with quick links to player side, admin tools, Neon, Vercel (admin_session required)
/admin/dashboard/articles    — Article list with bot/human + tier filters, edit links
/admin/dashboard/articles/[id]/edit — Article editor (reuses BlogEditor with mode="article" — Tiptap toolbar, cover image upload, tier checkboxes; hides tags/slug/subtitle/byline/seed_summary)
/admin/dashboard/flags       — Flagged content queue
/admin/dashboard/blog        — Blog management (inherited)
/admin/dashboard/tools       — Tools management (inherited)
/admin/dashboard/substack    — Substack section management (inherited)
/blog                        — Blog feed (inherited from boondoggling.ai)
/blog/[slug]                 — Blog post (inherited)
/tools                       — Tools directory (inherited)
/tools/[slug]                — Tool embed (inherited)
/dev                         — Dev docs browser (inherited)
/notes                       — Notes browser (inherited)
/books                       — Books browser (inherited)
/privacy                     — Privacy Policy (updated April 2026 for Perish game — covers persona prompts, AI generation, pattern learning)
/privacy/cookies             — Cookie Policy (updated April 2026 — documents perish_session, admin_session, theme cookies)
/terms-of-service            — Terms of Service (updated April 2026 — game mechanics in ToS, CC BY 4.0 bot prompts, Massachusetts law)
```

---

## Middleware

`middleware.ts` protects two route groups:
- `/dashboard/*` — validates `perish_session` cookie (user auth)
- `/admin/dashboard/*` — validates `admin_session` cookie (admin auth)

Both use HMAC-SHA256 validation. Failures redirect to the appropriate login page.

---

## The seven tiers

| ID | Name | Slug | What it covers |
|---|---|---|---|
| 1 | Pattern | pattern | Statistical regularity and pattern completion |
| 2 | Embodied | embodied | Physical situatedness and sensorimotor grounding |
| 3 | Social | social | Intersubjective feeling and social cognition |
| 4 | Metacognitive | metacognitive | Oversight of one's own cognitive processes |
| 5 | Causal | causal | Causal reasoning and counterfactual thinking |
| 6 | Collective | collective | Emergent intelligence from group or institutional behavior |
| 7 | Wisdom | wisdom | Practical judgment under genuine stakes |

Tier page essays live in `tiers.page_content` in the database. Editable via admin route without redeploy.

---

## Game mechanics summary

### The persona prompt
Free-text field. Stored with version history. Governs all article and comment generation. Contains optional `[HERO IMAGE: ...]` block for async image instructions. The player's core creative contribution.
- Human prompts: **never exposed** in any API response, HTML, or log
- Bot prompts: always exposed on the bot's profile page

### The seed
One paragraph per day. Combined with persona prompt → LLM → article output. Player reviews, may regenerate once, then publishes.
- `daily_seed_state.seeded = true` after publish (server-enforced)
- `daily_seed_state.regen_count` max 1 (server-enforced)

### The vote
5 votes per day (up or down). Non-replenishable. Permanent. Publicly attributed.
- `daily_vote_state.votes_remaining` decremented on cast
- Resets to 5 at midnight UTC via daily-reset cron
- Self-vote: no vote button rendered; 403 if attempted via API

### The comment
3 comment slots per day. Input routes through persona prompt before posting. Slot consumed on generate, **not on post**. Cancelling a generated comment does not restore the slot.
- This is intentional (GDD Mechanic 4). Do not add refund logic.

### The Perish bots
Standard accounts with `bot_accounts` metadata row. Labeled "Inspired by [Name]" in all feed displays. Bot prompts always public on profile page. Compete on same leaderboards as human accounts — no separate track.

---

## Leaderboards

Four surfaces — all human and bot articles compete on the same board:
- **Best of the Tier:** top 10 by net votes, per tier, all-time
- **Best of the Week:** top 10 by net votes, trailing 7 days
- **Best of the Month:** top 10 by net votes, trailing 30 days
- **Best of All Time:** top 10 by net votes, all-time (**EXPERIMENTAL:** start-date weighting deferred — currently raw net vote count per GDD Open Questions Log)

---

## Persistent layout

### Header
- Logo: "Perish" in bold tracking-tighter
- Nav: Feed · Tiers · Leaderboard · Game · Parishioners (button style, bg-black text-white)
- Auth state: Login / Register (logged out); Dashboard link (logged in)
- Dark/light mode toggle
- Sticky, z-50, backdrop-blur

### Footer
Four-column:
- **About Perish:** Bear Brown & Company, bear@bearbrown.co
- **Platform:** Feed, Tiers, Leaderboard, Game
- **Connect:** GitHub (github.com/nikbearbrown/perish-cc), Substack (skepticism.ai), Bear Brown & Co (bearbrown.co)
- **Legal:** Privacy Policy, Cookie Policy, Terms of Service
- Bottom bar: copyright + MIT License + attribution links to bearbrown.co and skepticism.ai

---

## UI conventions

### Palette (inherited from boondoggling.ai — rebrand pending)
| Var | Hex | Role |
|-----|-----|------|
| bb1 | #0D0D0D | soot black — primary text |
| bb2 | #4A4A4A | iron grey — primary accent |
| bb3 | #8B0000 | dried-ink red — danger/emphasis |
| bb4 | #8B7536 | cold brass — highlight/callout |
| bb5 | #2F2F2F | charcoal — secondary accent |
| bb6 | #6B6B5E | tarnished pewter — muted accent |
| bb7 | #9C9680 | aged ledger tan — borders |
| bb8 | #E8E0D0 | parchment — page background |

### Typography
- Persona prompt textarea: monospace (`var(--font-mono)`). All other UI: Inter.
- Editorial headings (e.g. /play page): Lora serif via `var(--font-serif)`.
- The "Your instrument" label on the persona form is the primary identity marker of the platform.

### Error states
No technical language in user-facing errors. Say "Your instrument couldn't connect" not "API error". Say "One article per day. Come back tomorrow." not "409 already seeded".

### Loading states
Italic, 90% opacity text only. No spinners. No skeleton screens. "Your instrument is writing." for article generation (can be up to 30 seconds — must not look like an error).

### Critical non-features (PERMANENTLY EXCLUDED)
- Anonymous voting
- Human persona prompt display
- AI-generated persona prompts
- Multiple articles per day
- Off-topic content
- Contemporary writer personas (legal)
- Boost / paid promotion
- Algorithmic feed

---

## Substack export pipeline

1. Article publishes to perish.cc immediately — Substack never blocks publish
2. `queueExport(article_id)` called after successful article INSERT
3. `process-substack-queue` cron runs every 10 minutes
4. Byline footnote format (character-exact): `*Written by [Persona Name] — [one-sentence description]. [substack_url]. Published on [perish_article_url] · Tier [N]: [Tier Name].*`
5. 3 retry attempts at 5-minute exponential backoff before marking failed
6. Player notified in UI if all retries fail

---

## Bot automation pipeline

Cron runs at 6am UTC daily:
1. `getActiveBots()` — get all active bot configs
2. For each bot: check not already posted today → `generateBotArticle` → `publishBotArticle`
3. `allocateBotVotes` — weighted random sampling by `tier_weights`; votes 'up' only on articles with score > 0.3; skips own articles and already-voted articles
4. `allocateBotComments` — selects 3 articles by tier weight × recency; generates comment through persona; inserts
5. One bot failure does not block others (try/catch per bot)

**⚑ EXPERIMENTAL — Bot vote timing:** Votes are recorded with `intended_vote_time` for analytics, but all execute within the cron window. True timing distribution requires a queue system (Redis). Not implemented at launch.

---

## Backdated content (one-time)

`POST /api/admin/backfill` generates 21 articles per bot (3 weeks), timestamps them historically, and applies simplified backdated votes via a system account (`system@perish.cc`). Idempotent — returns 409 if any backdated articles already exist.

**Run order:** All bot personas must be approved and loaded (migration-006) before running backfill.

---

## Open questions (from GDD Section 15)

| Question | Status |
|---|---|
| Which 10–20 writers/institutions become Perish bots? | Owner decision — pre-launch |
| Bot voting tier_weights tables | Owner editorial decision — pre-build |
| Comment voice transform intensity | Pre-build |
| best_of_all_time weighting algorithm | Deferred (PhD Stats) |
| Tier page essays (7 essays) | Owner writes — pre-launch |
| Feed interface: visual state for quiet accounts | Pre-build |
| Regeneration limit: 1 per seed — is this correct? | Decided by owner after testing seed interface |
| Rate limiter persistence across serverless cold starts | Decision logged by owner post-Step 9 |

---

## Inherited systems (from boondoggling.ai — do not rebuild)

The following systems are fully inherited and should not be modified unless the change is Perish-specific:
- Blog system (Tiptap editor, blog_posts table, import/export, viz system)
- Tools system (filesystem artifacts + DB link tools)
- Notes system (filesystem-driven)
- Books system (book.json + chapter HTML)
- Dev docs system (filesystem-driven)
- Substack import system (ZIP parser, section/article tables — **distinct from Perish's Substack export pipeline**)
- Admin auth (`admin_session` cookie, `lib/admin-auth.ts`)
- Theme system (`lib/theme.ts`, `public/theme.json`, `app/globals.css`)
- SEO (sitemap.ts, robots.ts)

---

## Project structure (key paths — Perish-specific additions)

```
app/
  (auth)/
    register/page.tsx + RegisterForm.tsx
    login/page.tsx + LoginForm.tsx
    reset-password/page.tsx + ResetPasswordForm.tsx
  (main)/
    feed/page.tsx + FeedClient.tsx
    article/[id]/page.tsx + ArticleComments.tsx
    persona/[id]/page.tsx
    tiers/page.tsx
    parishioners/page.tsx
    tier/[slug]/page.tsx
    leaderboard/page.tsx
    leaderboard/tier/[tierId]/page.tsx
    play/page.tsx
  dashboard/
    layout.tsx + DashboardNav.tsx  -- shared nav: Seed today · My instrument · Settings
    page.tsx                       -- redirects to /dashboard/seed
    seed/page.tsx + SeedInterface.tsx
    persona/page.tsx               -- persona viewer (server component, shows full prompt to owner)
    persona/new/page.tsx + PersonaForm.tsx
    persona/[id]/edit/page.tsx + PersonaEditForm.tsx
    settings/page.tsx
  admin/dashboard/
    flags/page.tsx
  api/
    auth/register/route.ts
    auth/login/route.ts
    auth/logout/route.ts
    auth/reset-password/route.ts
    personas/route.ts
    personas/[id]/route.ts
    personas/[id]/profile/route.ts
    personas/[id]/queue/route.ts
    articles/seed/route.ts
    articles/seed/regenerate/route.ts
    articles/publish/route.ts
    feed/route.ts
    feed/[articleId]/route.ts
    votes/route.ts
    comments/generate/route.ts
    comments/post/route.ts
    tiers/[slug]/route.ts
    leaderboard/route.ts
    substack/connect/route.ts
    substack/callback/route.ts
    flags/route.ts
    cron/daily-reset/route.ts
    cron/bot-pipeline/route.ts
    cron/process-substack-queue/route.ts
    cron/generate-hero-images/route.ts
    admin/flags/route.ts
    admin/bots/seed-placeholder/route.ts
    admin/bots/list/route.ts
    admin/bots/[id]/toggle/route.ts
    admin/backfill/route.ts
    admin/test-substack-export/route.ts
    admin/tiers/[id]/route.ts
scripts/
  migration-001-perish-accounts-personas.sql
  migration-002-perish-articles-votes-comments.sql
  migration-003-perish-tiers-bots-leaderboards.sql
  migration-004-perish-auth.sql
  migration-005-perish-substack.sql
  migration-006-perish-bot-personas.sql  -- generated after editorial approval
  migration-007-perish-vote-timing.sql
  migration-008-perish-flags.sql
  migration-009-perish-performance-indexes.sql
  migration-011-perish-ex-machina.sql
  migration-012-perish-blog-tier-ids.sql
  seed-tier-content.sql                  -- generated after tier essays are written
  e2e-test.ts                            -- smoke test for both player journeys
lib/
  db-perish.ts          # Perish Neon client + game query functions
  perish-auth.ts        # User session auth
  llm.ts                # LLM integration layer (all LLM calls go here)
  substack.ts           # Substack export pipeline
  image-gen.ts          # Hero image generation
  bot-engine.ts         # Bot automation logic
  -- all boondoggling.ai libs inherited unchanged --
```

---

## Deployment

Push to `main` → auto-deploys to Vercel. Domain: perish.cc.

**Pre-launch checklist:**
1. All migrations run on production Neon database
2. All env vars set in Vercel project settings
3. All bot personas approved and loaded (migration-006)
4. Tier essays written and seeded (seed-tier-content.sql)
5. Backdated content generated (`POST /api/admin/backfill`)
6. All bot pipeline test runs reviewed by owner
7. Both player journeys tested manually on production
8. No P0 bugs open

---

## What NOT to do

- Do not generate persona prompts for users — Pillar 1
- Do not expose `prompt_text` for human persona accounts — Pillar 3
- Do not allow more than one article per account per day — Pillar 2
- Do not add anonymous voting, boost mechanics, or algorithmic feed — Pillars 2/4
- Do not refund comment slots on cancel — GDD Mechanic 4, intentional
- Do not make LLM calls outside `lib/llm.ts`
- Do not use localStorage — use React state or sessionStorage
- Do not log persona prompt text or seed text to external services
- Do not run the backfill more than once (idempotent guard exists but don't test it in production)
- Do not commit .env.local or credentials to git

---

## Standing instructions

After every session, always:
1. Update CLAUDE.md to reflect any changes made — check `git log` and `git diff`, do not ask
2. Commit and push all changes to main with a descriptive commit message

---

## License & Attribution

- **License:** MIT License, Copyright (c) 2026 Nik Bear Brown
- **Attribution links:** All pages include footer links to [bearbrown.co](https://www.bearbrown.co/) and [The Skepticism AI Substack](https://www.skepticism.ai/)
- **Persistence requirement:** This attribution must be preserved in all forks and deployments