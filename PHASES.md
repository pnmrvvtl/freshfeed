# Implementation Phases

## Phase 0: Project Scaffolding
Status: NOT STARTED

- [ ] Init pnpm workspace with turbo
- [ ] Create apps/web (Next.js 15, App Router, experimental React)
- [ ] Create apps/server (NestJS 10)
- [ ] Create packages/shared
- [ ] TypeScript strict in all packages
- [ ] ESLint strict (typescript-eslint strict + stylistic) in all packages
- [ ] Prettier config
- [ ] Husky: pre-commit (lint + typecheck), pre-push (test:unit + build)
- [ ] docker-compose.yml with PostgreSQL 16
- [ ] Prisma init with User model
- [ ] Vitest setup in web
- [ ] Jest setup in server
- [ ] Root package.json scripts: lint, typecheck, test:unit, check, build, gen:types
- [ ] Verify: pnpm check passes, pnpm build succeeds, docker compose up starts DB

## Phase 1: Authentication
Status: NOT STARTED

Backend:
- [ ] Prisma User model (email, passwordHash, name, provider, providerId, role)
- [ ] Auth module: register (email+password), login, refresh token
- [ ] Passport JWT strategy
- [ ] Passport Google OAuth strategy
- [ ] Passport GitHub OAuth strategy
- [ ] JwtAuthGuard, RolesGuard
- [ ] Global ValidationPipe, HttpExceptionFilter
- [ ] Helmet, CORS, rate limiting middleware
- [ ] Swagger docs for all auth endpoints
- [ ] Unit tests for AuthService
- [ ] E2E tests for auth endpoints

Frontend:
- [ ] Login page with form
- [ ] Register page with form
- [ ] OAuth buttons (Google, GitHub)
- [ ] Auth Zustand store
- [ ] middleware.ts for route protection
- [ ] api-client.ts with token management
- [ ] Basic layout: Header with user menu
- [ ] Unit tests for auth store

Shared:
- [ ] Generate OpenAPI types
- [ ] Import in frontend api-client

## Phase 2: Synonym Tree with React Flow
Status: NOT STARTED

Backend:
- [ ] Prisma Term model, Synonym model (self-referential)
- [ ] Term module: CRUD
- [ ] Synonym module: generate tree, get tree, delete node/branch
- [ ] Effect.ts LLM service (local Ollama dev / remote prod)
- [ ] Level enforcement (2 free, 3 paid)
- [ ] Swagger docs
- [ ] Unit tests
- [ ] E2E tests

Frontend:
- [ ] Dashboard page with term list
- [ ] New term creation flow
- [ ] React Flow: custom synonym nodes, custom edges
- [ ] Tree editing: delete node, delete branch
- [ ] Generate button with loading state
- [ ] Level indicator
- [ ] Explorer Zustand store
- [ ] ViewTransition between dashboard and explorer
- [ ] Unit tests

## Phase 3: Article Search & Email Digest
Status: NOT STARTED

Backend:
- [ ] Prisma Article model, EmailLog model
- [ ] Article module: fetch, store, list
- [ ] Effect.ts RSS service (concurrent fetching, error accumulation)
- [ ] Effect.ts Email service (template, scheduling, retry)
- [ ] @nestjs/schedule cron for weekly fetch + send
- [ ] RSS sources: Google News, Reddit, HackerNews
- [ ] Swagger docs
- [ ] Unit tests
- [ ] E2E tests

Frontend:
- [ ] Article feed on dashboard
- [ ] Article cards (title, source, snippet, link)
- [ ] Last email sent indicator
- [ ] Settings page placeholder
- [ ] Unit tests

## Phase 4: Paid Subscription & Dashboard
Status: NOT STARTED

Backend:
- [ ] Subscription module with Stripe
- [ ] Checkout session, webhook handler
- [ ] User role transitions (FREE/PAID)
- [ ] Email schedule customization (day, time, frequency)
- [ ] Paid feature enforcement
- [ ] Swagger docs
- [ ] Unit tests
- [ ] E2E tests

Frontend:
- [ ] Pricing page with cards
- [ ] Upgrade/downgrade flow
- [ ] Settings: email schedule picker
- [ ] Dashboard: subscription status, usage stats
- [ ] Feature gating UI (upgrade prompts)
- [ ] Playwright E2E for full user flow
- [ ] Unit tests

## Phase 5: Polish & Deploy
Status: NOT STARTED

- [ ] Production Dockerfiles (multi-stage)
- [ ] docker-compose.prod.yml
- [ ] GitHub Actions CI/CD
- [ ] AWS ECS + RDS + SES setup
- [ ] Sentry error monitoring
- [ ] Lighthouse audit
- [ ] Bundle analysis
- [ ] Final E2E suite run
- [ ] README and deployment docs
