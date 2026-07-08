---
name: ASTRA dashboard had no visual hierarchy between daily ritual and exploration content
description: 15+ full-width sections were stacked with no grouping, making the daily habit loop feel identical in weight to optional/exploratory nav cards.
---

Dashboard.tsx stacked ~15 full-width sections in one flat list: briefing, stats bar, promise card, identity progress, identity statement, streak-freeze recovery, streak status bar, milestone card, tomorrow preview, alignment orb + quick log, evidence strip, reflection nudge/unlock, notification banner, then 5 secondary navigation cards (Mission Control, Life Scores, Future Self Letter, Log Today's Actions, Hall of Regret), then a weekly scorecard. Nothing distinguished "today's ritual" (make promise → complete action → build evidence → reflect) from "optional deeper exploration" (stats/nav pages) — visually everything had equal weight.

**Why:** flat, equal-weight stacking increases perceived complexity/decision fatigue even when the top-of-page ordering is already correct, and blurs the line between the daily habit loop (what should feel like a short, closeable ritual) and secondary content (browsable, no urgency) — which works against the "simple daily ritual" feeling that drives return-tomorrow behavior.

**How to apply:** the fix used was a lightweight labeled divider ("Explore Your Journey") inserted between the end of the daily-ritual sections and the start of the secondary nav-card sections — zero component/logic changes, just a visual chunking cue. When auditing dashboards/habit-loop home screens for this kind of app, check whether core-loop content and secondary/exploratory content are visually differentiated, not just correctly ordered.

Follow-up: `StreakStatusBar` also had a full-size urgency card duplicating the streak count already shown in the stats bar above, even on days when the user had already succeeded (state === "safe"). Collapsed that one state to a slim one-line strip (keeping the 14-day evidence chain) while leaving the "zero"/"unprotected"/"legendary" states — which carry genuine urgency or celebration value — as full-size cards. Rule of thumb: only compact/collapse a duplicated status card in the state where it adds no new decision-relevant info; keep it full-size wherever it's driving an action or reinforcing a win.
