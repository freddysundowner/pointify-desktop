---
name: PWA native/desktop feel
description: How the app achieves a native look — WCO titlebar, global CSS offsets, selection/scrollbar rules
---
Installed-app polish lives in three places: `client/index.css` (native-feel block), `client/index.html` (`#app-titlebar`), `client/public/manifest.webmanifest` (`display_override: window-controls-overlay`).

Rules:
- All titlebar handling is CSS-only and gated on `@media (display-mode: window-controls-overlay)`; `--titlebar-h` is 0 in a browser tab, so nothing changes there.
- Fixed/sticky viewport-top surfaces are offset globally via `.fixed.top-0, .sticky.top-0 { top: var(--titlebar-h) }` inside that media query — do NOT hand-edit every header. New top chrome should use `top-0` (or `top-[var(--titlebar-h)]`) so the rule catches it.
- **Why:** body padding only shifts document flow; fixed/sticky elements at top-0 otherwise render under the drag-region titlebar and become unclickable.
- Known tradeoff: sticky headers inside inner scroll containers also get the offset in WCO mode (small gap) — cosmetic, accepted.
- Review verdict: keep `cursor: pointer` on buttons and keep links/nav selectable; select-none is scoped to buttons/menuitems/tabs/labels only.
- Manifest changes (display_override, orientation) may need the installed PWA to be reinstalled/relaunched to take effect.
