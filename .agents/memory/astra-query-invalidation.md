---
name: React Query invalidation must cover every consumer, not just the primary one
description: When an action-logging mutation succeeds, all query keys whose derived UI depends on that data must be invalidated together, not just the "obvious" one.
---

In the ASTRA dashboard, `useGetTodayActions` (today only) and `useGetActions({limit:200})` (rolling window, powers weekly/streak sections) are two separate query keys backed by the same underlying `actions` table. Logging a new action only invalidated the "today" key for a long time, so any section computed from the wider `useGetActions` list (e.g. a weekly/momentum summary, longest-streak calculations) silently kept rendering stale data (or stayed hidden if it early-returns on empty data) even though the day-to-day counters looked fine.

**Why:** it's easy to invalidate the query key that visually matches the button you just wired up and forget sibling queries derived from overlapping data with a different limit/filter.

**How to apply:** when adding a new mutation that logs/completes user activity, grep for every `useGetX`/`useQuery` hook reading from the same table/domain and invalidate all of their query keys in the mutation's `onSuccess`, not just the one feeding the component you're currently building. Also check for components that call `return null` early when a derived list is empty — those will look like "features didn't wire up" bugs when the real cause is a missing invalidation.
