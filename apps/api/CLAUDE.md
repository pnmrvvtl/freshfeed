# API Context (apps/api)

## Architecture: NestJS Modular

```
src/
├── modules/
│   ├── auth/
│   │   ├── strategies/         ← jwt.strategy.ts, google.strategy.ts, github.strategy.ts
│   │   ├── guards/             ← jwt-auth.guard.ts, ws-jwt.guard.ts
│   │   ├── dto/                ← RegisterDto, LoginDto (class-validator)
│   │   ├── auth.service.ts     ← bcrypt, token generation
│   │   ├── auth.controller.ts  ← Swagger-first
│   │   └── auth.module.ts
│   ├── users/
│   │   ├── dto/
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── users.module.ts
│   ├── terms/                  ← user's main search terms
│   ├── synonyms/               ← LLM-generated synonym trees
│   ├── search/                 ← RSS parsing + article relevance
│   ├── email/                  ← BullMQ jobs + Nodemailer/Resend templates
│   └── billing/                ← Stripe integration
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── subscription.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── require-subscription.decorator.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts  ← wraps responses in { data, meta }
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── middleware/
│       └── security.middleware.ts
├── database/
│   └── prisma.service.ts
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── env.validation.ts      ← Zod schema, crashes app if invalid
└── main.ts
```

Define typed error classes per module:
```typescript
class InvalidCredentialsError { readonly _tag = 'InvalidCredentialsError' }
class UserNotFoundError { readonly _tag = 'UserNotFoundError'; constructor(readonly id: string) {} }
class DatabaseError { readonly _tag = 'DatabaseError'; constructor(readonly cause: unknown) {} }
```

GlobalExceptionFilter maps `_tag` to HTTP status codes.

## Swagger-First Development Rule
BEFORE writing any controller method implementation:
1. Add `@ApiTags('module-name')` on controller class
2. Add `@ApiOperation({ summary: '...' })` on each method
3. Add `@ApiResponse({ status: 200, type: ResponseDto })` for all possible responses
4. Add `@ApiBearerAuth()` on protected endpoints
5. Add `@ApiBody({ type: Dto })` for POST/PUT/PATCH
6. Only THEN write the implementation

Run `pnpm gen:types` after any endpoint changes.

## Security Implementation

### Global Setup (main.ts)
```typescript
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000 }
}))
app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true })
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false }
}))
app.useGlobalFilters(new GlobalExceptionFilter())
app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor())
```

### Rate Limiting
- Global: 100 req/min per IP
- Auth endpoints: 10 req/min per IP (stricter)
- Use `@nestjs/throttler` with Redis storage for distributed deployments

### CSRF Protection
- JWT in httpOnly SameSite=Strict cookies (primary protection)
- Custom CSRF token for state-mutating endpoints (double-submit cookie pattern)
- `CSRF-Token` header required on POST/PUT/PATCH/DELETE

### Input Sanitization
- `class-validator` with `@IsString()`, `@MaxLength()`, `@Matches()` on ALL DTOs
- `sanitize-html` for any field that accepts rich text
- Never use `$queryRawUnsafe` in Prisma — use `$queryRaw` with tagged templates only

### Password Security
- bcrypt with 12 rounds minimum
- Password strength validation in DTO: min 8 chars, 1 uppercase, 1 number, 1 special
- Never log passwords, tokens, or PII

## Database Performance Rules

### Prisma Schema
- Every foreign key field MUST have `@@index`
- Fields used in `WHERE` or `ORDER BY` MUST have index
- Enum types preferred over string for status fields
- `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt()` on every model

### Query Rules
- NEVER query inside a loop — use `findMany({ where: { id: { in: ids } } })`
- ALWAYS select only needed fields: `select: { id: true, email: true }` not `findMany()` bare
- Use `include` for relations needed in a single query — never make N separate queries
- Cursor-based pagination for all list endpoints (not offset)
- Wrap multi-step writes in `prisma.$transaction()`

### Caching Strategy
- Redis via `@nestjs/cache-manager` + `cache-manager-redis-store`
- Cache: LLM synonym results (TTL: 24h, key: `synonyms:{term}:{level}:{userId}`)
- Cache: RSS feed results (TTL: 6h, key: `rss:{term}`)
- Never cache user PII or auth tokens

## Auth Module Details

### JWT Strategy
- Access token: 15 min, payload: `{ sub: userId, email, subscription }`
- Refresh token: 7 days, stored hashed in DB (RefreshToken model)
- Refresh rotation: on use, old token invalidated, new pair issued
- Token stored in httpOnly, SameSite=Strict, Secure cookies

### OAuth (Passport)
- Google OAuth2: `passport-google-oauth20`
- GitHub OAuth2: `passport-github2`
- On callback: find or create user, issue JWT pair, redirect to frontend
- Link social accounts to existing email accounts

## Email Module
- BullMQ queue: `email-queue` backed by Redis
- Job types: `welcome`, `verify-email`, `weekly-digest`, `password-reset`
- Retry: 3 attempts with exponential backoff
- Dead letter queue for failed jobs after retries
- Templates: React Email or MJML for HTML templates
- Provider: Resend (primary) with env-based switch

## LLM Service Pattern
```typescript
interface LLMProvider {
  //...
}
// OllamaProvider implements LLMProvider (dev)
// AnthropicProvider implements LLMProvider (prod)
// Injected via NestJS custom provider based on LLM_PROVIDER env var
```
Always apply: timeout (30s), retry (2x), rate limiting per user.

## Testing
- Unit: Jest + `jest-mock-extended` for Prisma mocking
- E2E: Supertest with `@nestjs/testing` TestingModule
- E2E tests use a separate test database (TEST_DATABASE_URL env var)
- Reset DB between E2E test suites with `prisma migrate reset --force`
- Test files: `*.spec.ts` (unit) colocated, `test/e2e/*.e2e-spec.ts` for E2E
