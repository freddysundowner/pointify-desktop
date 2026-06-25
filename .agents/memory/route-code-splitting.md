---
name: Route code-splitting for initial load
description: Why App.tsx route components must be React.lazy(), and the chunking/SW pitfalls that come with it.
---

# Route code-splitting (client/src/App.tsx)

All route-target page/feature components in `App.tsx` must be loaded with
`React.lazy(() => import(...))`, with the route `<Switch>` wrapped in a
`<Suspense>`. Small routing/auth helpers (AttendantRoute, AdminRouteHandler,
PermissionsInit, NotFound) stay eager.

**Why:** statically importing every route inlines the whole app (all reports,
PDF, Excel, charts) into one entry bundle. With ~95 routes that was ~4 MB
(861 KB gzip) before the login screen could paint. Lazy routes cut the entry
chunk to ~240 KB (65 KB gzip); heavy libs and each page load on demand.

**How to apply:**
- When adding a new page/route, declare it as a `lazy()` const, never a static
  top-level `import` — a single static page import re-inflates the entry chunk.
- Heavy optional libs (jspdf/html2canvas, xlsx, pdfjs) are isolated via
  `build.manualChunks` in `vite.config.ts`; keep them out of eagerly-loaded
  modules so they stay in lazy chunks.
- This app registers a service worker (PROD) and has a dev SW-reset plugin.
  Lazy chunks + a stale SW can throw "Failed to fetch dynamically imported
  module" and blank the page, so a `ChunkErrorBoundary` around `<Suspense>`
  auto-reloads once (sessionStorage-guarded). Keep that boundary in place.
