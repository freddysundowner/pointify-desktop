import { networkMonitor } from './network-monitor.js';
import { setGlobalApiMode, setInternetAvailable } from './config.js';

/**
 * Network Status Handler - detects and processes online/offline events
 * and switches the proxy's API mode accordingly.
 *
 * NOTE: Server-side data sync was an Electron-only feature (it kept the
 * desktop app's local database in step with the cloud). The web build has
 * no local database — the browser client handles its own offline sync via
 * IndexedDB — so that machinery has been removed.
 */

// In-memory storage for admin ID to avoid repeated API calls
let cachedAdminId: string | null = null;

/**
 * Set admin ID in memory (called from login/registration)
 */
export function setAdminId(data: any) {
  cachedAdminId = data?._id;
}

/**
 * Get cached admin ID
 */
export function getCachedAdminId(): string | null {
  return cachedAdminId || null;
}

/**
 * Clear cached admin ID (called on logout)
 */
export function clearAdminId() {
  cachedAdminId = null;
}

// Network status monitoring: switch the proxy's API mode on connectivity
// changes. (Server-side data sync was an Electron-only feature and has been
// removed — the browser client handles its own offline sync via IndexedDB.)
networkMonitor.on('offline', () => {
  console.log('Network is offline');
  setGlobalApiMode('offline');
  setInternetAvailable(false);
});

networkMonitor.on('online', () => {
  console.log('Network is back online');
  setInternetAvailable(true);
  setGlobalApiMode('online');
});

networkMonitor.on('statusChange', (status: string) => {
  setGlobalApiMode(status as any);
});
