# Contracts Package (packages/contracts)

## Purpose
Single source of truth for all API types shared between frontend and backend.
Generated automatically from the NestJS Swagger/OpenAPI spec — never edit manually.

## How It Works
1. NestJS generates `openapi.json` on startup (`SwaggerModule.setup`)
2. `openapi-typescript` converts it to TypeScript types
3. Frontend imports types from `@termsync/contracts`

## Generation Script
```bash
pnpm gen:types
```
This runs:
1. Start API in schema-only mode to dump `openapi.json`
2. Run `openapi-typescript openapi.json -o src/index.ts`
3. Frontend gets fresh types immediately (workspace symlink)

## Rules
- NEVER manually edit files in `packages/contracts/src/`
- ALWAYS run `pnpm gen:types` after any NestJS DTO or controller signature change
- Frontend MUST import all API types from `@termsync/contracts`, never define them locally
- If a type is needed only on frontend (UI state, etc.) it lives in the relevant FSD layer
