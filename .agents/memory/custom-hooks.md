---
name: Custom hooks for new API endpoints
description: New endpoints not in the orval-generated spec go in src/hooks/ using fetch with credentials:"include" — no Authorization header needed
---

## Rule
For new backend routes added after orval codegen was run, create custom hooks in `artifacts/astra/src/hooks/`. Use `fetch` with `credentials: "include"` and NO Authorization header — Clerk auth is cookie-based for web.

**Why:** The api-client-react generated file should not be hand-edited (it's generated). New endpoints go in custom hooks. Clerk for web uses httpOnly cookies, not bearer tokens, so `credentials: "include"` is sufficient.

**How to apply:** See `artifacts/astra/src/hooks/useMissions.ts` as the pattern. Use `import.meta.env.BASE_URL` to prepend the base path.
