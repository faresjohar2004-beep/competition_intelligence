---
name: Coach AI context — mission-aware real-time context
description: The coaching API originally passed only 5 static profile fields to the AI. Fixed to inject today's missions + completion status, today's actions, and current life scores on every request.
---

## The Problem

`POST /api/coaching/messages` built `userContext` from only: name, career, goals, struggles, streak days. The AI had zero knowledge of:
- Today's specific mission texts
- Which missions were already completed
- What actions had been logged today
- Current health/discipline/wealth/knowledge/confidence scores

Every conversation was context-blind — generic advice regardless of where the user actually stood.

## The Fix (Applied)

**File:** `artifacts/api-server/src/routes/coaching.ts`

Added `buildUserContext(userId, user)` — an async helper that runs three queries in `Promise.all`:
1. `missionsTable` — today's row (criticalMission, secondaryMission1-3, courageChallenge + all 5 completion booleans)
2. `actionsTable` — today's logged action types
3. `futureSelfTable` — current row (all 5 life-area scores)

The composed context string now looks like:
```
Name: ..., Streak: 14 days. Actions logged today (2): workout, deep work. Life scores — Health: 67, Discipline: 58, ...
TODAY'S MISSIONS:
  Critical [○ not yet]: Complete a 90-minute deep work block...
  Secondary 1 [✓ done]: Read for 25 minutes...
  ...
  Courage Challenge [○ not yet]: Post one piece of content publicly...
```

**Why:** The coach is the highest-trust surface in the app — users come there when they're struggling. If the AI doesn't know their specific missions and current completion state, it gives generic motivation when it should give targeted, mission-specific accountability. This turns ASTRA from a chatbot into a genuine real-time strategist.

**How to apply:** Any new AI feature in the coaching flow should use `buildUserContext` (or extend it) rather than the old static string. The `Promise.all` pattern keeps the extra DB queries from adding latency.
