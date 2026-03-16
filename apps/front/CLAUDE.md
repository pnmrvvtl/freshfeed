# Web App Context (apps/front)

## Architecture Pattern: Feature-Sliced Design (FSD)

Strict layer hierarchy — imports only go downward:
`app → pages → widgets → features → entities → shared`

```
src/
├── app/                          ← Next.js App Router + providers
│   ├── (public)/                 ← landing, login, register, verify-email
│   ├── (protected)/              ← requires auth (middleware enforced)
│   │   ├── dashboard/
│   │   ├── terms/
│   │   └── (paid)/               ← requires paid subscription
│   │       └── settings/
│   ├── api/                      ← Route Handlers (session, oauth callbacks)
│   ├── layout.tsx
│   └── providers.tsx             ← TanStack Query, Zustand hydration
├── widgets/                      ← composed UI blocks (SynonymTreeWidget, HeaderWidget)
├── features/                     ← use-case slices
│   ├── auth/                     ← login form, register form, oauth buttons
│   ├── synonym-tree/             ← React Flow tree, edit/delete nodes
│   ├── term-search/              ← term input, suggestions
│   └── email-preferences/        ← schedule picker (paid only)
├── entities/
│   ├── user/
│   │   ├── model/                ← User type (from contracts), zod schema
│   │   ├── api/                  ← useSession(), useUser() TanStack hooks
│   │   └── store/                ← Zustand user slice
│   └── term/
│       ├── model/
│       └── api/
├── shared/
│   ├── api/                      ← base fetch client, error handling
│   ├── ui/                       ← Button, Input, Card, Modal primitives
│   ├── lib/                      ← cn(), formatDate(), etc
│   └── config/                   ← env.ts (validated), routes.ts (constants)
```

## Routing & Auth Protection

### middleware.ts (Edge Runtime)

- Reads JWT from httpOnly cookie
- Verifies token signature using jose (edge-compatible)
- Redirects unauthenticated users from `(protected)` routes to `/login`
- Redirects free users from `(paid)` routes to `/upgrade`
- Redirects already-authenticated users away from `/login` and `/register`

### Route Groups

- `(public)` — accessible to everyone, no auth check
- `(protected)` — valid JWT required
- `(protected)/(paid)` — valid JWT + `subscription === 'paid'` required

## Global State Rules

**Zustand** — ONLY for:

- Current user object + subscription status (hydrated from session endpoint)
- UI-only state (sidebar open/closed, theme preference)

**TanStack Query** — for ALL server data:

- Terms list, synonym trees, email preferences, billing status
- Never store server data in Zustand
- Always invalidate query cache after mutations

### User Store Pattern

```typescript
interface UserStore {
  user: User | null
  subscription: 'free' | 'paid' | null
  setUser: (user: User | null) => void
  clear: () => void
}
```

Hydrated once on app load from `/api/auth/session` route handler.

## API Client

- Base client in `shared/api/client.ts`
- Uses `fetch` with credentials: 'include' for cookie auth
- Interceptor: on 401 → attempt token refresh → retry once → redirect to login
- All types imported from `packages/contracts` (never define API types manually in web)
- Use TanStack Query hooks, never raw fetch in components

## Forms

- React Hook Form + Zod for all forms
- Zod schema defined in `entity/model` or `feature/model`, reused in backend validation
- Never use uncontrolled inputs outside of RHF

## Animations

- **Micro-animations** (hover states, button feedback, skeleton loading, focus rings): pure CSS transitions and animations
- **Route/page transitions**: View Transition API + React `<ViewTransition>` component
- **Complex UI transitions** (tree node add/remove, panel expand): View Transition API with named view-transition-name
- NEVER use framer-motion, GSAP, or any animation library — keep bundle lean
- `next.config.ts` must have `experimental: { viewTransition: true }`

## React Flow (Synonym Tree)

- `@xyflow/react` latest
- Custom node types: `TermNode` (root), `SynonymNode` (child), `AddNode` (placeholder)
- Custom edge types with animated dashed lines
- Node deletion triggers API mutation + local state update via TanStack Query
- Tree layout: use `dagre` or `elkjs` for automatic hierarchical layout
- Free users: nodes beyond level 2 are visible but locked with upgrade prompt
- Paid users: full 3-level tree

## ViewTransition Usage

```tsx
import { ViewTransition } from 'react'

// Page-level transitions — wrap page content
// Use view-transition-name CSS property for element-level continuity
// Use startViewTransition() for imperative cases
```

## Performance

- All data-fetching in Server Components where possible
- Client Components only when interactivity required (forms, React Flow, animated elements)
- Lazy load React Flow (heavy) with next/dynamic and loading skeleton
- Images: next/image always
- Fonts: next/font always

## Testing

- Vitest config in `vitest.config.ts`
- Test files: `*.test.ts` / `*.test.tsx` colocated with source
- Mock TanStack Query with `@tanstack/react-query` test utils
- Mock Zustand stores directly (reset between tests)
- Playwright E2E in `tests/e2e/` — test auth flows, synonym tree CRUD, upgrade flow
