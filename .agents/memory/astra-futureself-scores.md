---
name: FutureSelf score history — real vs synthetic
description: The /api/future-self/scores endpoint originally used Math.random() causing chart scramble on every load; replaced with real reconstruction from actionsTable impacts.
---

## The Problem

`GET /api/future-self/scores` used `Math.random()` inside its loop, generating fresh random noise on every request. The 30-day score history chart in the FutureSelf page therefore scrambled visually on every page load — actively destroying user trust in their progress data.

## The Fix (Applied)

**File:** `artifacts/api-server/src/routes/futureSelf.ts`

Strategy: `score_on_day_D = current_score − sum(impacts from actions logged AFTER day D)`

- Fetch all the user's actions from `actionsTable` (full history, not windowed)
- For each of 30 historical day slots, subtract the accumulated impacts from actions that occurred after that day's end boundary
- Returns a genuine upward-trending curve that reflects actual logging behaviour
- Clamp all values to [10, 99] to prevent underflow

**Why:** The current score in `futureSelfTable` IS the cumulative sum of all logged impacts plus the baseline. Removing "future" impacts mathematically reconstructs what the score was at any past point. No schema changes or migrations needed.

**How to apply:** Any new score-history endpoint should use the same backward-reconstruction pattern rather than synthetic generation. If per-day snapshots are later added to the schema, prefer those; fall back to reconstruction only if snapshots are absent.
