import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import "./index.css";
import { CartProvider } from "./contexts/CartContext";

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <CartProvider>
    <App />
    </CartProvider>
    
  </Provider>
);
