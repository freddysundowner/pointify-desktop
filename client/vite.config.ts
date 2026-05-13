import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin } from 'vite';

// In dev mode, if the browser has a stale service worker that cached a
// production build, it will request hashed assets like /assets/index-XYZ.js
// that don't exist on the Vite dev server.  Instead of 404-ing (which leaves
// the page blank), we return a tiny JS snippet that clears all SWs + caches
// and reloads the page — breaking the stale-cache cycle automatically.
function swResetFallbackPlugin(): Plugin {
  return {
    name: 'sw-reset-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (url.startsWith('/assets/') && (url.endsWith('.js') || url.endsWith('.css'))) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-store');
          res.end(`
(async function() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch(e) {}
  window.location.reload();
})();
`);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), swResetFallbackPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:1999',
    },
  },
});
