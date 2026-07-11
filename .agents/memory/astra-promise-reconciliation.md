---
name: ASTRA promise reconciliation — Actions page vs Dashboard
description: The /actions page must call completeMission("critical") after any log to match Dashboard QuickLog behavior; without it, promise stays "Pending" even after user logs actions.
---

## The Problem

The Dashboard QuickLog calls `completeMission.mutate("critical")` after logging any action, so the promise card shows "Kept" immediately. The `/actions` page originally did NOT do this — users who tapped the "Actions" tab on mobile and logged there would see "Today's Promise: Pending" on the dashboard despite having done the work.

## The Fix (Applied)

In `Actions.tsx`:
1. Import `useMissions` and `useCompleteMission` from `@/hooks/useMissions`
2. Import `getGetUserStatsQueryKey` and `getGetActionsQueryKey` for full invalidation
3. In `handleLog`, after successful action log, call `completeMission.mutate("critical")` if `!wasPromiseCompleted && missions?.criticalMission`
4. Added `TodaysPromiseBanner` component above the action grid — shows today's critical mission text in pending/completed state
5. Added `promiseJustKept` flag to `CompletionCelebration` — shows a "Today's Promise — Kept" callout in the celebration modal when the action sealed the promise

**Why:** The core loop breaks when "Complete Action" → doesn't update "Today's Promise" → user feels unacknowledged → retention suffers. Both entry points (Dashboard QuickLog and /actions page) must produce identical promise completion outcomes.

**How to apply:** Any new action-logging surface (new page, modal, etc.) must also call `completeMission.mutate("critical")` if missions exist and critical isn't yet complete.
