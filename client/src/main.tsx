import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { installKenyanTimeZone } from "./lib/timezone";
import { store } from "./store";
import App from "./App";
import "./index.css";
import { CartProvider } from "./contexts/CartContext";

// Render all dates/times in Kenyan time (EAT, UTC+3) everywhere, regardless of
// the viewer's device or server timezone. Must run before any date is formatted.
installKenyanTimeZone();

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      // Reload once when a new worker takes control so users never stay stuck
      // on a stale/buggy worker after a deploy.
      let reloadedForNewSW = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadedForNewSW) return;
        reloadedForNewSW = true;
        location.reload();
      });
      // updateViaCache: 'none' => the sw.js script is never served from the HTTP
      // cache, so the browser always sees a changed worker and updates it.
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          // Force an immediate update check on every load.
          reg.update().catch(() => {});
        })
        .catch(() => {});
    });
  } else {
    // In dev, ensure any previously-installed SW is removed and its caches cleared
    // so cached old JS bundles can't shadow Vite's HMR output. If we actually
    // unregister something or wipe a cache, force a one-time reload so the very
    // next request bypasses the SW entirely.
    (async () => {
      let needsReload = false;
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          await Promise.all(regs.map((r) => r.unregister()));
          needsReload = true;
        }
      } catch {}
      try {
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys();
          if (keys.length > 0) {
            await Promise.all(keys.map((k) => caches.delete(k)));
            needsReload = true;
          }
        }
      } catch {}
      if (needsReload && !sessionStorage.getItem('__sw_purged__')) {
        sessionStorage.setItem('__sw_purged__', '1');
        location.reload();
      }
    })();
  }
}

// Expose a global so the app can dismiss the splash once auth is ready.
// Calling it multiple times is safe — the element is removed after the fade.
(window as any).__hideSplash = () => {
  const splash = document.getElementById("splash");
  if (!splash) return;
  splash.style.transition = "opacity 0.35s ease";
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 370);
};

// Safety net: never let the splash spin forever. If the auth check hangs
// (unreachable server, stalled request), dismiss it after 10s so the user
// sees the app's own UI/error state instead of an endless spinner.
setTimeout(() => (window as any).__hideSplash?.(), 10000);

const root = createRoot(document.getElementById("root")!);
root.render(
  <Provider store={store}>
    <CartProvider>
      <App />
    </CartProvider>
  </Provider>
);
