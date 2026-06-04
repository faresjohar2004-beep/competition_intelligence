---
name: Orval generated hook naming convention
description: Hook names follow the route operation ID, not a useGet* pattern — admin routes generate useAdminGet*, not useGetAdmin*
---

## Rule
The generated hooks in `lib/api-client-react/src/generated/api.ts` follow the OpenAPI operation ID, which mirrors the route structure. Examples:
- `GET /admin/users` → `useAdminGetUsers` (not `useGetAdminUsers`)
- `GET /admin/metrics` → `useAdminGetMetrics`
- `POST /biography/generate` → `useGenerateBiographyEntry` (not `useGenerateTodayBiography`)

**Why:** orval derives the hook name from the operation ID in the OpenAPI spec, which prefixes the resource group.

**How to apply:** When a page import fails with "No matching export", grep the generated api.ts for the actual hook name rather than guessing.
