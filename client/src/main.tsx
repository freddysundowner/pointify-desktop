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
    // so cached old JS bundles can't shadow Vite's HMR output.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }
}

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <CartProvider>
    <App />
    </CartProvider>
    
  </Provider>
);
