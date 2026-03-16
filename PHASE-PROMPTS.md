# TermSync — Implementation Phases & Claude Code Prompts

## Rules for Every Session

- Start each session with: "Read CLAUDE.md"
- Use `/clear` between phases
- Run `pnpm check` at the end of every phase before finishing
- If Claude starts making architectural decisions without asking — stop it and ask for your approval first
- At the end of each phase, Claude must go through the checklist below the prompt and mark every completed item with `[x]`

---

## Phase 0: Project Scaffolding

Status: COMPLETE

### Checklist

- [x] Init pnpm workspace with Turborepo
- [x] Create apps/front (Next.js, React 19 canary, App Router)
- [x] Create apps/back (NestJS)
- [x] Create packages/contracts (openapi-typescript codegen + gen:types script)
- [x] TypeScript strict in all packages (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)
- [x] ESLint strict in all packages (typescript-eslint `recommended-type-checked` + `stylistic`)
- [x] Prettier config shared across all packages
- [x] Husky: pre-commit (lint + typecheck), pre-push (full pnpm check)
- [x] Root turbo.json with lint, typecheck, test:unit, build, check pipelines
- [x] Root package.json scripts: lint, typecheck, test:unit, check, build, gen:types
- [x] apps/front: Tailwind v4, shadcn/ui, React Flow (@xyflow/react), TanStack Query v5, Zustand v5, React Hook Form, Zod, Vitest, Playwright
- [x] apps/front: `viewTransition: true` in next.config.ts
- [x] apps/back: Prisma, class-validator, class-transformer, Passport (jwt + google + github), @nestjs/swagger, @nestjs/throttler, @nestjs/schedule, BullMQ, Helmet, Jest, Supertest
- [x] docker-compose.yml with PostgreSQL 16 + Redis 7 (health checks included)
- [x] Prisma init with base User model
- [x] Verify: `pnpm check` passes on empty scaffolding
- [x] Verify: `docker compose up` starts DB and Redis healthy

### Claude Code Prompt

```
Read CLAUDE.md.

Initialize the TermSync monorepo with this exact structure:
- pnpm workspaces + Turborepo
- apps/front: Next.js, React 19 canary, TypeScript strict, Tailwind v4, shadcn/ui, React Flow (@xyflow/react), TanStack Query v5, Zustand v5, React Hook Form, Zod, Vitest, Playwright. Enable viewTransition: true in next.config.ts.
- apps/back: NestJS, TypeScript strict, Prisma, class-validator, class-transformer, Passport (jwt + google + github), @nestjs/swagger, @nestjs/throttler, @nestjs/schedule, BullMQ, Helmet, Jest, Supertest.
- packages/contracts: openapi-typescript codegen setup with gen:types script.

Configure:
- ESLint strict for both apps (typescript-eslint recommended-type-checked + stylistic rulesets)
- TypeScript strict mode for both apps (strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true)
- Prettier config shared across all packages
- Husky: pre-commit runs lint+typecheck, pre-push runs full pnpm check
- Root turbo.json with lint, typecheck, test:unit, build, check pipelines
- pnpm-workspace.yaml
- docker-compose.yml with PostgreSQL 16 + Redis 7 with health checks
- Prisma init with a base User model

Do NOT implement any features. Scaffold only.

When finished, go through the Phase 0 checklist in PHASE-PROMPTS.md and mark every completed item [x]. Then verify `pnpm check` passes and `docker compose up` starts all services healthy.
```

---

## Phase 1: Authentication

Status: COMPLETE

### Checklist

**Backend**

- [x] Prisma User model (id, email, passwordHash, name, provider, providerId, role, emailVerified, createdAt, updatedAt)
- [x] Prisma RefreshToken model with hashed storage
- [x] Use db-architect subagent for schema review before migration
- [x] Swagger-decorated controller skeletons created by api-documenter subagent BEFORE implementation:
  - [x] POST /auth/register
  - [x] POST /auth/login
  - [x] POST /auth/logout
  - [x] POST /auth/refresh
  - [x] GET /auth/me
  - [x] GET /auth/google + GET /auth/google/callback
  - [x] GET /auth/github + GET /auth/github/callback
  - [x] POST /auth/verify-email
  - [x] POST /auth/resend-verification
- [x] AuthModule: register (email+password), bcrypt 12 rounds
- [x] AuthModule: login with httpOnly cookie (access 15min + refresh 7d)
- [x] Refresh token rotation (invalidate old on use)
- [x] Passport JWT strategy
- [x] Passport Google OAuth2 strategy
- [x] Passport GitHub OAuth2 strategy
- [x] JwtAuthGuard, RolesGuard, SubscriptionGuard (stubs)
- [x] @CurrentUser(), @Public(), @RequireSubscription() decorators
- [x] GlobalExceptionFilter
- [x] TransformInterceptor wrapping responses in `{ data, meta }`
- [x] Global: Helmet, CORS (whitelist), ThrottlerModule (auth endpoints: 10 req/min)
- [x] Global ValidationPipe (whitelist: true, forbidNonWhitelisted: true, transform: true)
- [x] Email verification BullMQ job (welcome + verify-email templates)
- [x] Unit tests for AuthService (jest-mock-extended for Prisma)
- [x] E2E tests for all auth endpoints (Supertest)
- [x] code-reviewer subagent run on all new files
- [x] security-auditor subagent run on auth module

**Frontend**

- [x] Generate OpenAPI types: `pnpm gen:types`
- [x] middleware.ts protecting `(protected)` and `(paid)` route groups (edge runtime, jose)
- [x] entities/user: User type from contracts, Zustand store (user + subscription)
- [x] entities/user: useSession() TanStack Query hook (revalidates on focus)
- [x] Base API client in shared/api/client.ts (credentials: include, 401 → refresh → retry)
- [x] features/auth: login form (React Hook Form + Zod)
- [x] features/auth: register form (React Hook Form + Zod)
- [x] features/auth: Google + GitHub OAuth buttons
- [x] features/auth: email verification page
- [x] Redirect logic after login/logout
- [x] Basic layout: Header with user menu (auth state aware)
- [x] Unit tests for auth store and useSession hook
- [x] code-reviewer subagent run on all new frontend files

**Shared**

- [x] OpenAPI types regenerated after all endpoints finalized
- [x] Frontend api-client uses types exclusively from @termsync/contracts

### Claude Code Prompt

```
Read CLAUDE.md and apps/back/CLAUDE.md.

Step 1 — use the api-documenter subagent to create Swagger-decorated controller skeletons for these auth endpoints (do NOT implement yet, wait for approval):
POST /auth/register, POST /auth/login, POST /auth/logout, POST /auth/refresh, GET /auth/me,
GET /auth/google, GET /auth/google/callback, GET /auth/github, GET /auth/github/callback,
POST /auth/verify-email, POST /auth/resend-verification

Step 2 — after approval, use the db-architect subagent to design:
User model (id, email, passwordHash, name, provider, providerId, role enum, emailVerified, createdAt, updatedAt)
RefreshToken model (id, tokenHash, userId, expiresAt, createdAt)

Step 3 — implement:
1. AuthModule, AuthService. Typed error classes: InvalidCredentialsError, UserNotFoundError, EmailAlreadyExistsError, DatabaseError, TokenExpiredError
2. JWT strategy + Google OAuth2 strategy + GitHub OAuth2 strategy via Passport
3. httpOnly SameSite=Strict cookie handling (access 15min + refresh 7d with rotation)
4. Email verification flow via BullMQ job
5. GlobalExceptionFilter
6. TransformInterceptor wrapping all responses in { data, meta }
7. Global setup: Helmet, CORS whitelist, ThrottlerModule (stricter on auth endpoints), ValidationPipe (whitelist + forbidNonWhitelisted)
8. Decorators: @CurrentUser(), @Public(), @RequireSubscription()

Step 4 — use code-reviewer subagent on all new backend files.
Step 5 — use test-writer subagent: unit tests for AuthService + E2E tests for all auth endpoints.
Step 6 — use security-auditor subagent on the entire auth module.

Step 7 — Frontend. Read apps/front/CLAUDE.md:
1. middleware.ts protecting (protected) and (paid) route groups using jose (edge-compatible JWT verify)
2. entities/user: Zustand store + useSession() TanStack Query hook
3. Base API client: shared/api/client.ts with credentials:include + 401 refresh retry
4. features/auth: login form, register form, OAuth buttons, email verification page — all with React Hook Form + Zod
5. Redirect logic post-login/logout
6. Header widget with auth state

Step 8 — run `pnpm gen:types`.
Step 9 — use code-reviewer subagent on all new frontend files.

When finished, go through the Phase 1 checklist in PHASE-PROMPTS.md and mark every completed item [x]. Then run `pnpm check` and confirm it passes.
```

---

## Phase 2: Synonym Tree with React Flow

Status: NOT STARTED

### Checklist

**Backend**

- [ ] Use api-documenter subagent for Terms + Synonyms endpoints before implementation
- [ ] Use db-architect subagent for Term + SynonymNode + SynonymEdge Prisma models (with indexes)
- [ ] TermsModule: CRUD (create term, list user terms, delete term)
- [ ] SynonymsModule: LLMService interface
- [ ] OllamaProvider implementing LLMService (dev, via OLLAMA_BASE_URL)
- [ ] AnthropicProvider implementing LLMService (prod, via ANTHROPIC_API_KEY)
- [ ] LLM_PROVIDER env var switches providers via NestJS custom provider
- [ ] LLM calls: 30s timeout + 2 retries
- [ ] Generate tree endpoint: respects level limits (free=2, paid=3)
- [ ] SubscriptionGuard blocking level-3 generation for free users
- [ ] Redis cache for LLM results (TTL 24h, key: `synonyms:{term}:{level}:{userId}`)
- [ ] Endpoints: generate tree, get saved tree, delete node (cascades children), delete branch
- [ ] code-reviewer subagent on all new files
- [ ] test-writer subagent: unit tests for SynonymsService, LLMService; E2E tests

**Frontend**

- [ ] Lazy-load React Flow with next/dynamic + loading skeleton
- [ ] Custom node types: TermNode (root), SynonymNode, LockedNode (free users at level 3)
- [ ] Custom edge types with animated dashed lines
- [ ] dagre layout for automatic hierarchical tree positioning
- [ ] Delete node/branch with optimistic TanStack Query mutation
- [ ] Generate button with loading state + error handling
- [ ] Upgrade prompt overlay on LockedNode
- [ ] ViewTransition for node add/remove animations (view-transition-name per node)
- [ ] Term list on dashboard with React Flow preview thumbnail
- [ ] code-reviewer subagent on all new frontend files
- [ ] test-writer subagent: unit tests for tree store, node components

### Claude Code Prompt

```
Read CLAUDE.md, apps/back/CLAUDE.md, apps/front/CLAUDE.md.

Step 1 — use api-documenter subagent for these endpoints (approve before implementing):
GET /terms, POST /terms, DELETE /terms/:id
POST /terms/:id/synonyms/generate, GET /terms/:id/synonyms, DELETE /synonyms/:nodeId, DELETE /synonyms/:nodeId/branch

Step 2 — use db-architect subagent to design:
Term model (id, userId, text, createdAt, updatedAt)
SynonymNode model (id, termId, parentId self-referential, text, level, createdAt)
SynonymEdge model (id, sourceId, targetId, termId)
All with proper indexes.

Step 3 — implement backend:
1. TermsModule: full CRUD, user-scoped (only own terms)
2. SynonymsModule with LLMService interface + OllamaProvider + AnthropicProvider
   - Switch via LLM_PROVIDER env var using NestJS custom provider token
   - 30s timeout + 2 retries
   - Free users: max 2 levels. Paid users: max 3 levels. SubscriptionGuard enforces this.
   - Cache results in Redis TTL 24h
   - Save full tree (nodes + edges) to DB
   - Delete node cascades children in DB

Step 4 — use code-reviewer subagent on all new backend files.
Step 5 — use test-writer subagent.

Step 6 — implement frontend:
1. Lazy-load React Flow with next/dynamic + skeleton
2. Custom nodes: TermNode (root, not deletable), SynonymNode (deletable), LockedNode (upgrade prompt overlay)
3. Custom edges: animated dashed lines
4. dagre auto-layout on tree load and after node deletion
5. Optimistic mutation: delete node removes from UI immediately, reverts on error
6. ViewTransition on node add/remove using view-transition-name CSS property per node id
7. Generate button: calls generate endpoint, polls until complete, re-renders tree
8. Term list on dashboard showing all user terms with mini-preview

Step 7 — use code-reviewer subagent on frontend files.
Step 8 — use test-writer subagent.

When finished, go through the Phase 2 checklist in PHASE-PROMPTS.md and mark every completed item [x]. Then run `pnpm check` and confirm it passes.
```

---

## Phase 3: Article Search & Email Digest

Status: NOT STARTED

### Checklist

**Backend**

- [ ] Use api-documenter subagent for Search + EmailPreferences endpoints
- [ ] Prisma Article model (id, termId, title, url, source, snippet, publishedAt, createdAt)
- [ ] Prisma EmailLog model (id, userId, termId, sentAt, articleCount)
- [ ] Prisma EmailPreferences model (id, userId, dayOfWeek, hour, timezone, frequencyDays)
- [ ] SearchModule: RSS feed parser service (rss-parser package)
- [ ] RSS sources: Google News RSS, Reddit RSS, Hacker News RSS
- [ ] Concurrent RSS fetching with error accumulation (one failing source doesn't stop others)
- [ ] Article deduplication by URL
- [ ] Relevance scoring (term match in title > snippet > source)
- [ ] Redis cache for RSS results (TTL 6h, key: `rss:{term}`)
- [ ] EmailModule: React Email or MJML template for digest
- [ ] BullMQ weekly-digest job with 3 retries + exponential backoff
- [ ] @nestjs/schedule cron: every Monday 9am UTC (free users default)
- [ ] Paid users: schedule from EmailPreferences model
- [ ] Resend provider (configurable via EMAIL_PROVIDER env if needed)
- [ ] code-reviewer subagent
- [ ] test-writer subagent: unit tests for RSS service, email service; E2E tests

**Frontend**

- [ ] Dashboard: article feed per term (title, source, snippet, link, published date)
- [ ] Article cards with external link handling
- [ ] "Last email sent" + "Next scheduled" indicators per term
- [ ] Email preferences settings page (inside `(paid)` route group)
- [ ] Schedule picker: day of week, hour, timezone selector
- [ ] code-reviewer subagent + test-writer subagent

### Claude Code Prompt

```
Read CLAUDE.md, apps/back/CLAUDE.md.

Step 1 — use api-documenter subagent for:
GET /search?termId=&refresh=  (manual trigger, returns cached or fresh articles)
GET /articles?termId=         (list saved articles for a term)
GET /email-preferences        (paid only)
PUT /email-preferences        (paid only)
POST /email/send-test         (paid only, trigger manual digest for testing)

Step 2 — use db-architect subagent for:
Article model, EmailLog model, EmailPreferences model (with indexes on termId, userId, publishedAt)

Step 3 — implement backend:
1. SearchModule:
   - RSSService: fetch from Google News RSS, Reddit RSS, HN RSS for a given term + synonyms array
   - Concurrent fetching with Promise.allSettled (failed sources logged, not thrown)
   - Dedup by URL, score by title/snippet match to term
   - Cache in Redis TTL 6h
   - Save new articles to DB (upsert by URL)
2. EmailModule:
   - Digest email template (React Email): term name, top 10 articles, unsubscribe link
   - BullMQ job: fetch articles for term + synonyms → render template → send via Resend
   - Retry: 3 attempts, exponential backoff
   - Log sent emails to EmailLog
3. @nestjs/schedule:
   - Cron every Monday 9am UTC: find all free users with terms → enqueue digest jobs
   - Cron for paid users: respect EmailPreferences schedule

Step 4 — use code-reviewer subagent.
Step 5 — use test-writer subagent.

Step 6 — implement frontend:
1. Dashboard: per-term article cards (title, source, snippet, published, external link)
2. "Last digest sent: X days ago" + "Next: Monday 9am UTC" indicators
3. Settings page in (paid) route group: email schedule picker (day, hour, timezone with Intl.supportedValuesOf)

Step 7 — code-reviewer + test-writer subagents on frontend files.

When finished, go through the Phase 3 checklist in PHASE-PROMPTS.md and mark every completed item [x]. Then run `pnpm check` and confirm it passes.
```

---

## Phase 4: Paid Subscription & Dashboard

Status: NOT STARTED

### Checklist

**Backend**

- [ ] Use api-documenter subagent for Billing endpoints
- [ ] Prisma Subscription model (id, userId, stripeCustomerId, stripePriceId, stripeSubscriptionId, status, currentPeriodEnd)
- [ ] Use db-architect subagent for Subscription model + indexes
- [ ] BillingModule: Stripe Checkout session creation
- [ ] BillingModule: Stripe Customer Portal session creation
- [ ] Stripe webhook handler (signature validation with raw body)
- [ ] Webhook events: subscription.created, subscription.updated, subscription.deleted, payment_intent.payment_failed
- [ ] User role/subscription status updated via webhook
- [ ] SubscriptionGuard reads from DB (Redis cache TTL 5min, key: `sub:{userId}`)
- [ ] Cache invalidated on webhook update
- [ ] code-reviewer subagent
- [ ] security-auditor subagent (Stripe webhook raw body validation is critical)
- [ ] test-writer subagent

**Frontend**

- [ ] Pricing page: free vs paid feature comparison cards
- [ ] Stripe Checkout redirect flow (POST to /billing/checkout → redirect to Stripe)
- [ ] Success page + cancel page after Stripe redirect
- [ ] Dashboard: subscription status badge, billing portal button
- [ ] Conditional UI throughout app (upgrade prompts on locked features)
- [ ] Playwright E2E: full user flow (register → add term → generate tree → upgrade → level 3 unlocked)
- [ ] code-reviewer subagent + test-writer subagent

### Claude Code Prompt

```
Read CLAUDE.md, apps/back/CLAUDE.md, apps/front/CLAUDE.md.

Step 1 — use api-documenter subagent for:
POST /billing/checkout         (create Stripe Checkout session)
POST /billing/portal           (create Stripe Customer Portal session)
POST /billing/webhook          (Stripe webhook — @Public(), raw body required)
GET  /billing/subscription     (current user subscription status)

Step 2 — use db-architect subagent for:
Subscription model (id, userId, stripeCustomerId, stripePriceId, stripeSubscriptionId, status enum, currentPeriodEnd, createdAt, updatedAt)
Add stripeCustomerId to User model.

Step 3 — implement backend:
1. BillingModule with Stripe SDK
2. Checkout: create or retrieve Stripe customer → create Checkout session → return URL
3. Portal: create Customer Portal session for managing/cancelling subscription
4. Webhook: verify Stripe signature using raw body (NEVER parsed JSON body for webhook route)
   Handle: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
   On each: upsert Subscription in DB, update User.role, invalidate Redis cache `sub:{userId}`
5. SubscriptionGuard: check Redis first (TTL 5min), fallback to DB query

Step 4 — use code-reviewer subagent.
Step 5 — use security-auditor subagent (focus: raw body handling, signature verification, no bypass).
Step 6 — use test-writer subagent.

Step 7 — implement frontend:
1. Pricing page: clear free vs paid table (2 vs 3 levels, custom schedule, etc.)
2. Upgrade button → POST /billing/checkout → redirect to Stripe URL
3. /billing/success and /billing/cancel pages
4. Dashboard: subscription status badge (Free / Pro), "Manage subscription" button → portal
5. Wrap locked features app-wide with UpgradePrompt component (reads from Zustand user.subscription)

Step 8 — Playwright E2E test covering full flow:
register → verify email → add term → generate 2-level tree → hit upgrade → (mock Stripe success webhook) → generate 3-level tree unlocked

Step 9 — code-reviewer + test-writer subagents.

When finished, go through the Phase 4 checklist in PHASE-PROMPTS.md and mark every completed item [x]. Then run `pnpm check` and confirm it passes.
```

---

## Phase 5: Polish & Production Deploy

Status: NOT STARTED

### Checklist

**Docker & Infrastructure**

- [ ] Multi-stage Dockerfile for apps/back (builder → production, no devDependencies in final image)
- [ ] Multi-stage Dockerfile for apps/front (builder → production with standalone output)
- [ ] docker-compose.yml: web, api, postgres, redis — hot reload, health checks, named volumes
- [ ] docker-compose.prod.yml: no source mounts, resource limits (memory/cpu), restart policies
- [ ] Prisma `migrate deploy` in api container entrypoint (before app starts)
- [ ] All env vars documented in .env.example (final pass)

**CI/CD**

- [ ] GitHub Actions: on PR → `pnpm check` (lint + typecheck + unit tests)
- [ ] GitHub Actions: on push to main → build Docker images → push to AWS ECR
- [ ] GitHub Actions: E2E tests against docker-compose test environment

**Monitoring**

- [ ] Sentry error monitoring in both apps/back and apps/front
- [ ] Structured logging in api (pino or winston) — no console.log in production
- [ ] Health check endpoint: GET /health (api) returning DB + Redis status

**Quality**

- [ ] Lighthouse audit — score ≥90 performance, ≥95 accessibility
- [ ] Bundle analysis for apps/front (next build --analyze or @next/bundle-analyzer)
- [ ] Final full Playwright E2E suite run
- [ ] Final `pnpm check` from root

**Docs**

- [ ] README.md: setup, env vars, running locally, running tests, deploying
- [ ] AWS deployment notes: ECS Fargate task definitions or EC2 + ECR setup

### Claude Code Prompt

```
Read CLAUDE.md.

Step 1 — Multi-stage Dockerfiles:
- apps/back: stage 1 (builder): install all deps, generate Prisma client, build. Stage 2 (production): copy dist + node_modules (prod only) + prisma schema. Entrypoint: prisma migrate deploy && node dist/main
- apps/front: stage 1 (builder): install deps, next build (output: standalone). Stage 2 (production): copy .next/standalone + .next/static + public. Use next/standalone for minimal image.

Step 2 — docker-compose.yml update:
Add web and api services with build context. Hot reload via volume mounts. Health checks: api (GET /health), postgres (pg_isready), redis (redis-cli ping). Named volumes for postgres data.

Step 3 — docker-compose.prod.yml:
No source mounts. Memory limits: api 512m, web 256m, postgres 1g. restart: always. Reads from .env file.

Step 4 — GET /health endpoint in api:
Returns { status: 'ok', db: 'ok'|'error', redis: 'ok'|'error' }. @Public(). No auth required.

Step 5 — GitHub Actions:
.github/workflows/ci.yml: on PR → checkout → pnpm install → pnpm check
.github/workflows/deploy.yml: on push main → build images → push to ECR (uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, ECR_REGISTRY secrets)

Step 6 — Sentry: add @sentry/nestjs to api, @sentry/nextjs to web. Configure via SENTRY_DSN env var. Instrument unhandled errors only (not noisy).

Step 7 — replace any console.log in api with pino logger (nestjs-pino). Structured JSON output in production.

Step 8 — run full Playwright E2E suite against docker-compose environment.
Step 9 — run Lighthouse CI on apps/front.
Step 10 — write README.md covering: prerequisites, local setup, env vars, pnpm check, docker compose up, deploying to AWS.

When finished, go through the Phase 5 checklist in PHASE-PROMPTS.md and mark every completed item [x]. Then run `pnpm check` and `docker compose up` and confirm everything is healthy.
```

---

## Reusable Slash Commands

Create these in `.claude/commands/` after Phase 0:

**check-phase.md**

```
Run pnpm check from repo root. If it fails, fix all errors before proceeding. Show me the full output.
```

**swagger-first.md**

```
Before implementing this endpoint, use the api-documenter subagent to create the Swagger-decorated controller skeleton. Do not write any implementation until I explicitly approve the API contract.
```

**review-and-test.md**

```
Run code-reviewer subagent on all files changed in this session. Then run test-writer subagent to add any missing tests. Then run pnpm check and show the result.
```

**security-check.md**

```
Run security-auditor subagent on the files touched in this session. Show all findings grouped by severity (Critical, High, Medium, Low).
```
