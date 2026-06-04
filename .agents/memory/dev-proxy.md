---
name: Dev proxy pattern for ASTRA
description: API server must proxy non-API requests to Vite dev server so the preview pane (port 80) can serve the React app
---

## Rule
In development, add `createProxyMiddleware` at the end of `artifacts/api-server/src/app.ts` to forward all non-API, non-Clerk requests to Vite on port 20686.

**Why:** Port 8080→80 is the API server. Port 20686→3000 is Vite. The Replit preview pane hits port 80. Without the proxy, the preview shows a blank page because the API server doesn't serve HTML.

**How to apply:** Already done. If removed, re-add:
```ts
if (process.env.NODE_ENV !== "production") {
  app.use("/", createProxyMiddleware({ target: "http://localhost:20686", changeOrigin: true, ws: true }));
}
```
Must be placed AFTER all API routes.
