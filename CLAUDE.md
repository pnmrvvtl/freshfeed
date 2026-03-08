# Synonym Explorer

## Project
Monorepo: Next.js frontend + NestJS backend + shared types package.
Package manager: pnpm with workspaces. Build orchestration: Turborepo.

## Structure
- `apps/web/` — Next.js 15 (App Router, experimental React with ViewTransition)
- `apps/server/` — NestJS with Prisma ORM, PostgreSQL
- `packages/shared/` — OpenAPI-generated TypeScript types shared between front and back

## Code Standards
- TypeScript strict mode in all packages
- Never write comments in code
- Never use `any` — use `unknown` with type guards when needed
- ESLint with typescript-eslint strict + stylistic rulesets
- No default exports except for Next.js pages/layouts and NestJS modules
- Prefer named exports, explicit return types on functions

## Verification Commands
- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Unit tests: `pnpm test:unit`
- All checks: `pnpm check` (runs lint + typecheck + test:unit)
- E2E backend: `pnpm --filter server test:e2e`
- E2E frontend: `pnpm --filter web test:e2e`
- Build: `pnpm build`
- Generate API types: `pnpm gen:types`

## Workflow
1. Before implementing a feature, read the relevant CLAUDE.md in the app directory
2. After any change: run `pnpm check` to verify nothing is broken
3. After changing backend API: run `pnpm gen:types` to update shared types
4. Write unit tests for all new services and utilities
5. Use Effect.ts ONLY in: `apps/server/src/effect/llm.service.ts`, `apps/server/src/effect/rss.service.ts`, `apps/server/src/modules/email/email.service.ts`
6. Everywhere else use standard async/await patterns

## Architecture Rules
- Frontend state: Zustand stores in `apps/web/src/stores/`
- API client: type-safe wrapper in `apps/web/src/lib/api-client.ts` using shared OpenAPI types
- Backend auth: JWT (15min access + 7day refresh, httpOnly cookies), Passport strategies
- Database: Prisma with explicit `select`/`include` — never lazy load, no raw SQL
- Animations: CSS transitions for simple, View Transition API for page transitions — NO animation libraries
- Security: Helmet, CORS whitelist, rate limiting on auth, class-validator whitelist, bcrypt 12 rounds

## Git
- Conventional commits: feat/fix/refactor/test/docs/chore
- Branch naming: feature/*, fix/*, refactor/*
- Husky: pre-commit runs lint+typecheck, pre-push runs unit tests + build
