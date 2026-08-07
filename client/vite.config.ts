import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import type { Plugin } from 'vite';

// Stamp sw.js with a unique build version on every production build so
// the service worker cache is automatically busted on each new deploy.
function swCacheBustPlugin(): Plugin {
  return {
    name: 'sw-cache-bust',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (!fs.existsSync(swPath)) return;
      const version = `pointify-shell-${Date.now()}`;
      const content = fs.readFileSync(swPath, 'utf-8').replace(/__CACHE_VERSION__/g, version);
      fs.writeFileSync(swPath, content);
    },
  };
}

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
  plugins: [react(), swResetFallbackPlugin(), swCacheBustPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Group heavy, optional libraries into their own cacheable chunks so
        // they stay out of the initial bundle and are only fetched by the
        // (lazy-loaded) routes that actually use them.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/jspdf') || id.includes('/html2canvas') || id.includes('/dompurify') || id.includes('/canvg')) return 'pdf-vendor';
          if (id.includes('/xlsx')) return 'xlsx-vendor';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
          if (id.includes('/@radix-ui/')) return 'radix-vendor';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
