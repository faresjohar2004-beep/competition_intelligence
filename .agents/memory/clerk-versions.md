---
name: Clerk version pinning
description: @clerk/react and @clerk/shared must be updated in lockstep; version mismatch causes missing export errors at build time
---

## Rule
Always update `@clerk/react` and `@clerk/themes` together. Never mix @clerk/react@5.54+ with @clerk/shared@3.47.x.

**Why:** @clerk/react@5.54.0 introduced UI component system exports (`loadClerkUiScript`, `clerkUiScriptUrl`, `buildClerkUiScriptAttributes`) that only exist in @clerk/shared@4.x. The workspace lockfile can resolve two versions simultaneously causing a silent mismatch.

**How to apply:** When you see "No matching export in @clerk/shared for import X" from @clerk/react, run:
```
pnpm --filter @workspace/<app> add @clerk/react@latest @clerk/themes@latest
```
This pulls @clerk/shared@4.x as a peer dep automatically.
