# Claude Code — Phase Prompts

Rules for every session:
- Start each session with: "Read CLAUDE.md"
- Use `/clear` between phases
- Run `pnpm check` at the end of every phase before finishing
- If Claude starts making architectural decisions without asking — stop it and ask for your approval first

---

## PHASE 0 — Monorepo Initialization

```
Read CLAUDE.md. 

Initialize the TermSync monorepo with this exact structure:
- pnpm workspaces + Turborepo
- apps/web: Next.js 15 canary, React 19 canary, TypeScript strict, Tailwind v4, shadcn/ui, React Flow (@xyflow/react), TanStack Query v5, Zustand v5, React Hook Form, Zod, Vitest, Playwright. Enable viewTransition in next.config.ts.
- apps/api: NestJS 10, TypeScript strict, Prisma, class-validator, class-transformer, Passport (jwt + google + github), @nestjs/swagger, @nestjs/throttler, @nestjs/schedule, BullMQ, Effect (effect package), Helmet, Jest, Supertest.
- packages/contracts: openapi-typescript codegen setup with gen:types script.

Configure:
- ESLint strict for both apps (TypeScript ESLint recommended-type-checked ruleset)
- TypeScript strict mode for both apps (strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true)
- Husky: pre-commit runs lint+typecheck, pre-push runs full pnpm check
- Root turbo.json with lint, typecheck, test:unit, build, check pipelines
- pnpm-workspace.yaml

Do NOT implement any features. Scaffold only. Verify `pnpm check` passes on empty scaffolding before finishing.
```

---

## PHASE 1 — Auth (Backend + Frontend)

```
Read CLAUDE.md and apps/api/CLAUDE.md.

First, use the api-documenter subagent to create Swagger-decorated controller skeletons for these auth endpoints:
POST /auth/register (email + password)
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET /auth/me
GET /auth/google (redirect)
GET /auth/google/callback
GET /auth/github (redirect)
GET /auth/github/callback
POST /auth/verify-email
POST /auth/resend-verification

After documentation is approved, implement:
1. Prisma User model + RefreshToken model (use db-architect subagent for schema)
2. AuthModule with JWT strategy, Google OAuth2 strategy, GitHub OAuth2 strategy
3. httpOnly cookie handling (access 15min + refresh 7d with rotation)
4. Email verification flow with BullMQ job

Then: use the code-reviewer subagent on all new files.
Then: use the test-writer subagent for unit tests (AuthService) and E2E tests (all auth endpoints).
Then: use the security-auditor subagent on the auth module.

Frontend (apps/web):
Read apps/web/CLAUDE.md.
1. middleware.ts protecting (protected) and (paid) route groups
2. entities/user store (Zustand) + useSession hook (TanStack Query)
3. features/auth: login form, register form, Google/GitHub OAuth buttons, email verification page
4. All forms use React Hook Form + Zod
5. Redirect logic after login/logout

Run pnpm check before finishing.
```

---

## PHASE 2 — Synonym Tree

```
Read CLAUDE.md, apps/api/CLAUDE.md, apps/web/CLAUDE.md.

Backend:
1. Use api-documenter subagent for Terms + Synonyms endpoints
2. Use db-architect subagent for Term + SynonymNode + SynonymEdge Prisma models
3. Implement TermsModule: CRUD for user terms
4. Implement SynonymsModule: 
   - LLMService interface with OllamaProvider (dev) and AnthropicProvider (prod)
   - Switch via LLM_PROVIDER env var
   - Generate synonym tree up to 2 levels (free) or 3 levels (paid)
   - SubscriptionGuard blocking level-3 generation for free users
   - Cache LLM results in Redis (TTL 24h)
   - Save tree structure to DB
5. Endpoints: generate tree, get saved tree, delete node (cascades children), delete branch

Frontend:
1. Lazy-load React Flow with next/dynamic
2. Custom node types: TermNode (root), SynonymNode, LockedNode (free users level 3)
3. dagre layout for automatic tree positioning
4. Delete node/branch with optimistic update via TanStack Query mutation
5. ViewTransition for node add/remove animations
6. Upgrade prompt overlay on locked nodes

Use code-reviewer subagent, then test-writer subagent.
Run pnpm check before finishing.
```

---

## PHASE 3 — Search & Weekly Email

```
Read CLAUDE.md, apps/api/CLAUDE.md.

Backend:
1. Use api-documenter subagent for Search + EmailPreferences endpoints
2. Implement SearchModule:
   - RSS feed parser service (rss-parser package)
   - Search using main term + synonyms array
   - Score and deduplicate articles
   - Cache results in Redis (TTL 6h)
3. Implement EmailModule:
   - BullMQ weekly-digest job
   - @nestjs/schedule cron: every Monday 9am UTC (free users)
   - Paid users: custom schedule from EmailPreferences DB model
   - React Email or MJML template for digest email
   - Resend provider
4. EmailPreferences model (paid only): dayOfWeek, hour, timezone, frequencyDays

Frontend:
1. Dashboard page: list of terms with last email sent, next scheduled
2. Email preferences settings page (paid only, inside (paid) route group)
3. Schedule picker component with timezone support

Use code-reviewer subagent, then test-writer subagent.
Run pnpm check before finishing.
```

---

## PHASE 4 — Dashboard + Billing

```
Read CLAUDE.md, apps/api/CLAUDE.md, apps/web/CLAUDE.md.

Backend:
1. Use api-documenter subagent for Billing endpoints
2. Implement BillingModule:
   - Stripe Checkout session creation
   - Stripe webhook handler (subscription.created, subscription.updated, subscription.deleted)
   - Update user subscription status in DB via webhook
   - SubscriptionGuard reads from DB (cached in Redis, TTL 5min)
3. Prisma: add Subscription model linked to User

Frontend:
1. Upgrade page: pricing comparison (free vs paid features)
2. Stripe Checkout redirect flow
3. Success/cancel pages after Stripe redirect
4. User dashboard: subscription status, billing portal link (Stripe Customer Portal)
5. Conditional UI throughout app based on subscription tier

Use code-reviewer subagent, then security-auditor subagent (Stripe webhook validation is critical).
Run pnpm check before finishing.
```

---

## PHASE 5 — Docker + Production Readiness

```
Read CLAUDE.md.

1. Multi-stage Dockerfiles for apps/web and apps/api (builder + production stages)
2. docker-compose.yml: web, api, postgres, redis with health checks and hot reload
3. docker-compose.prod.yml: production config, no source mounts, resource limits
4. GitHub Actions CI pipeline:
   - On PR: pnpm check (lint + typecheck + unit tests)
   - On main push: build Docker images + push to ECR
5. AWS deployment notes: ECS Fargate task definitions (or EC2 + ECR setup)
6. Prisma migration in Docker entrypoint (migrate deploy before start)
7. Environment variable documentation update in .env.example

Run full pnpm check and docker-compose up to verify all services start healthy.
```

---

## Useful Slash Commands (save these)

After phase 0, create these as `.claude/commands/`:

**check-phase.md**: "Run pnpm check from repo root. If it fails, fix all errors before proceeding. Show me the output."

**swagger-first.md**: "Before implementing this endpoint, use the api-documenter subagent to create the Swagger-decorated controller skeleton. Do not write implementation until I approve the API contract."

**review-and-test.md**: "Run code-reviewer subagent on all files changed in this session. Then run test-writer subagent to add missing tests. Then run pnpm check."
