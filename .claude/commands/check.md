Run the full quality gate in order:
1. `pnpm lint` — report any ESLint errors
2. `pnpm typecheck` — report any TypeScript errors
3. `pnpm test:unit` — report any failing tests

If all pass, say "All checks passed."
If any step fails, show the errors and suggest specific fixes.
Do not proceed to the next step if the current one fails.
