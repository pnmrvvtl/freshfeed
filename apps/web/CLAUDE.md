# Frontend — Next.js

## Stack
Next.js 15 (App Router), React 19 experimental, Tailwind, React Flow, Zustand, Vitest

## Key Patterns
- App Router with route groups: `(auth)` for public routes, `(dashboard)` for protected routes
- Middleware at `src/middleware.ts` handles auth redirects
- Server Components by default, `"use client"` only when state/effects/events are needed
- ViewTransition for page transitions — `viewTransition: true` in next.config.ts
- Auth tokens stored in httpOnly cookies managed by the backend — NO localStorage

## Component Rules
- Functional components only
- Props interface defined above the component, not inline
- Extract reusable hooks to `src/hooks/`
- No barrel exports (no `index.ts` re-exports) — import directly from file
- Never use `any` — use `unknown` with type guards

## State Management
- Zustand for global client state: `src/stores/`
- Three stores: `auth-store.ts`, `explorer-store.ts`, `ui-store.ts`
- Use selectors to prevent unnecessary re-renders
- Server state (API data) fetched via Server Components or `use` hook, not stored in Zustand

## API Communication
- Type-safe fetch wrapper in `src/lib/api-client.ts`
- Types imported from `@synonym-explorer/shared` (OpenAPI-generated)
- Auto token refresh on 401 responses

## Testing
- Vitest for unit tests: colocated as `*.test.ts(x)` or in `__tests__/`
- `@testing-library/react` for component tests
- `msw` for API mocking in tests
- Playwright for E2E in `e2e/` directory

## Verification
- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter web test:unit`
- `pnpm --filter web test:e2e`
