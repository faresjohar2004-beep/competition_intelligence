---
name: Silent mutation failures are a retention risk in habit-loop apps
description: ASTRA's toast/notification UI (Toaster, use-toast) was wired into App.tsx but never used by any page-level mutation — every action-logging, promise, streak-freeze, and reflection mutation had zero onError handling.
---

Every core-loop mutation in Dashboard.tsx and Reflections.tsx (log action, complete mission, save tomorrow's promise, streak freeze, save reflection) had no `onError` handler at all. On a failed request (network blip, expired session, transient 5xx), the button just stopped spinning with no feedback — the user has no way to know whether their action/promise/reflection was recorded or not.

**Why:** in a daily-habit app the emotional stakes of "did my streak just break?" are high; a silent failure at exactly the moment a user is trying to log their one daily action is a disproportionately damaging trust break and a plausible silent-churn cause, worse than a visible error the user can retry.

**How to apply:** whenever a codebase already has a toast/notification system mounted globally (check `App.tsx`/root layout for a `<Toaster />` or similar) but individual mutations don't call it on `onError`, treat that gap as a de facto engagement bug in habit/streak-based products — the fix is nearly free (infra exists) and the downside of leaving it is silent, unmeasurable churn. Grep for `useMutation`/`.mutate(` call sites in core-loop files and confirm each has an `onError` before assuming the loop is "done."
