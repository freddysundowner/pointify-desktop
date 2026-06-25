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

/**
 * Server-side data sync was an Electron-only feature. In the web build there
 * is no local database to sync, so this is a no-op kept for call-site
 * compatibility (login flow, network reconnect, write interceptor).
 */
async function performDataSync(_force = false) {
  return;
}

// Initialize network status monitoring

// Listen for offline event
networkMonitor.on('offline', () => {
  console.log('Network is offline');
  setGlobalApiMode('offline');
  setInternetAvailable(false);
  handleOfflineStatus();
});

// Listen for online event
networkMonitor.on('online', () => {
  console.log('Network is back online');
  setInternetAvailable(true);
  setGlobalApiMode('online');
  performDataSync();
  handleOnlineStatus();
});

// Listen for status changes
networkMonitor.on('statusChange', (status, previousStatus) => {
  handleStatusChange(status, previousStatus);
});

// Custom offline handler
async function handleOfflineStatus() {
}

// Custom online handler
async function handleOnlineStatus() {
  console.log('handleOnlineStatus');
}

// Custom status change handler
function handleStatusChange(status: string, _previousStatus: string) {
  setGlobalApiMode(status as any);
}

// Export functions if needed elsewhere
export { handleOfflineStatus, handleOnlineStatus, handleStatusChange, performDataSync };
