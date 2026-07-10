---
name: Clerk v6 Google OAuth — Safari popup fix
description: iOS Safari opens OAuth popup as blank tab; fix is to use signIn.sso() without popup arg (full-page redirect). Also documents v6 API shape change.
---

## The Problem

iOS Safari (and WKWebView) opens Clerk's default Google OAuth flow as a blank `about:blank` tab that never navigates. Clerk uses `window.open()` internally for the social button — this popup-based flow is broken in iOS Safari/WebView environments.

## The Fix

Replace Clerk's built-in social button with a custom button that calls `signIn.sso()` **without** a `popup` window arg. When `popup` is omitted, Clerk does a full-page redirect instead of opening a popup — works in all browsers.

```typescript
// sso() without popup = full-page redirect (Safari-safe)
await signIn.sso({
  strategy: "oauth_google",
  redirectUrl: `${window.location.origin}${basePath}/sign-in/sso-callback`,
  redirectCallbackUrl: `${window.location.origin}${basePath}/sign-in`,
});
```

Also hide Clerk's built-in social buttons in the appearance config so there aren't two Google buttons:
```typescript
elements: {
  socialButtonsRoot: "!hidden",
  dividerRow: "!hidden",
  ...
}
```

## Clerk v6 API Shape Change

In `@clerk/react` v6, `useSignIn()` returns `SignInSignalValue` (signals-based), NOT `{ signIn, isLoaded }`.
- `signIn` is of type `SignInFutureResource` — does NOT have `authenticateWithRedirect()`
- Instead use `signIn.sso({ strategy, redirectUrl, redirectCallbackUrl, popup? })`
- `isLoaded` is gone — check `if (!signIn)` instead

**Why:** Clerk v6 migrated from `SignInResource` (old hooks pattern with `isLoaded`) to `SignInFutureResource` (signals pattern). `authenticateWithRedirect` was renamed to `sso()` with slightly different params.

## Package Versions

After fixing: `@clerk/react@6.11.4`, `@clerk/themes@2.4.62`, `@clerk/shared@^4.24.0` (api-server).
Note: `@clerk/shared/keys` subpath export only exists in `@clerk/shared@4.24.0+` — upgrading api-server required bumping shared from 4.15.0 to 4.24.0.
