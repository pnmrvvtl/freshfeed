Regenerate OpenAPI types from the backend Swagger spec:
1. Ensure the server builds: `pnpm --filter server build`
2. Generate OpenAPI JSON: `pnpm --filter server swagger:generate`
3. Convert to TypeScript: `npx openapi-typescript apps/server/openapi.json -o packages/shared/src/api-types.ts`
4. Verify frontend compiles: `pnpm --filter web typecheck`

Report any breaking changes in the generated types compared to git diff.
