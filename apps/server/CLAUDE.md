# Backend — NestJS

## Stack
NestJS 10, Prisma, PostgreSQL, Passport (JWT + OAuth), Swagger, Effect.ts (selective), Jest

## Key Patterns
- Module-per-feature in `src/modules/`
- Prisma as single source of truth for DB — schema in `prisma/schema.prisma`
- All endpoints documented with `@nestjs/swagger` decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- Guards for auth (`JwtAuthGuard`) and roles (`RolesGuard`)
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`
- Global `HttpExceptionFilter` for consistent JSON error responses

## Effect.ts Usage
- ONLY in: `src/effect/llm.service.ts`, `src/effect/rss.service.ts`, `src/modules/email/email.service.ts`
- Integration via `@nestjs-effect/core` `EffectModule` and `EffectRuntimeInterceptor`
- All other services: standard NestJS async/await patterns
- Never use `any` in Effect pipelines — use typed errors and `@effect/schema`

## Security Checklist
- Helmet middleware for HTTP headers
- CORS with explicit origins array, not wildcard
- Rate limiting on auth endpoints via `@nestjs/throttler`
- Input validation on EVERY endpoint via class-validator DTOs
- Passwords: bcrypt with 12+ salt rounds
- JWT: 15min access token, 7day refresh token, httpOnly cookies
- Prisma parameterized queries — no raw SQL
- No sensitive data in responses (exclude passwordHash from user queries)

## Database Rules
- Always use explicit `select` or `include` in Prisma queries
- Cursor-based pagination for lists (`cursor`, `take`, `skip`)
- Indexes: `Term(userId, createdAt)`, `Synonym(termId, level)`, `Article(termId, publishedAt)`
- Use `createMany` for batch inserts
- Never return more than 50 items per page

## Testing
- Jest for unit tests: colocated as `*.spec.ts`
- `@nestjs/testing` with `Test.createTestingModule()` for DI in tests
- Supertest for E2E tests in `test/` directory
- Mock Prisma with manual mock class or `jest.mock()`
- Mock external APIs (LLM, SMTP) in all test types

## Verification
- `pnpm --filter server lint`
- `pnpm --filter server typecheck`
- `pnpm --filter server test:unit`
- `pnpm --filter server test:e2e`
