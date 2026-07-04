---
name: Multiple parallel completion paths must reconcile to the same state
description: In ASTRA, "Today's Promise" (critical mission) and "Quick Log" were two separate UI paths for logging the same underlying accomplishment, but only one updated the mission's completed flag.
---

The dashboard had two different buttons a user could press to represent "I did my thing today": the flagship "Keep My Promise" CTA (which called `completeMission.mutate("critical")`) and the "Quick Log" grid (which only called `logAction.mutate`). A user who did their real work via Quick Log never saw their "Today's Promise" card flip to its celebratory kept state, because nothing in the Quick Log success handler marked the critical mission complete.

**Why:** this silently broke the app's single biggest emotional payoff moment (the promise card celebration) for any user who happened to interact via the "wrong" button, directly undermining the identity-reinforcement loop the feature was built for. It's an easy bug to miss because both paths "work" in isolation — the bug only shows up when comparing what state each path leaves behind.

**How to apply:** whenever a product has more than one entry point that represents the same underlying user accomplishment (e.g. two buttons that both "count" as completing today's goal), audit that every entry point converges on the same completion state, not just that each one independently succeeds. Grep for all `.mutate(...)` call sites touching the same concept (missions, streaks, promises) and confirm they all update the same source-of-truth fields.
