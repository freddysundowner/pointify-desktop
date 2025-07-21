import { networkMonitor } from './network-monitor.js';
import { makeOnlinePointifyRequest, makeLocalPointifyRequest, getGlobalApiMode, makeOnlineFormDataSyncDumpCall } from './config.js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

/**
 * Network Status Handler - Single file to handle network status changes
 * This is where network offline/online events are detected and processed
 */

// In-memory storage for admin ID to avoid repeated API calls
let cachedAdminId: string | null = null;

// Timer for periodic sync operations (2 minutes)
let syncInterval: NodeJS.Timeout | null = null;
const SYNC_INTERVAL_MS = 2 * 60 * 1000; 2  // 2 minutes

// Constants to avoid hardcoding
const SYNC_HEADERS = { 'Content-Type': 'application/json' };
const SYNC_STATUS_SUCCESS = 'success';
const SYNC_STATUS_OFFLINE = 'offline';
 
/**
 * Create sync dump payload helper
 */
function createSyncDumpPayload(syncResponse: any, adminId: string) {
  return {
    downloadUrl: syncResponse.downloadUrl,
    latestSyncTime: syncResponse.latestSyncTime,
    id: syncResponse.id || adminId,
    status: syncResponse.status
  };
}

/**
 * Perform sync operation with API endpoint
 */
async function performSyncOperation(
  endpoint: string, 
  apiFunction: any, 
  successCallback: (response: any, adminId: string) => Promise<void>,
  operationName: string
) {
  try {
    const adminId = getCachedAdminId();
    
    if (!adminId) {
      return;
    }

    const syncResponse = await apiFunction(endpoint, {
      method: 'GET',
      headers: SYNC_HEADERS
    });


    if (syncResponse && syncResponse.status === SYNC_STATUS_SUCCESS) {
      await successCallback(syncResponse, adminId);
    } else {
    }

  } catch (error) {
    console.error(`🚨 ${operationName} error:`, error);
  }
}

/**
 * Set admin ID in memory (called from login/registration)
 */
export function setAdminId(adminId: string) {
  cachedAdminId = adminId;
}

export function setRefreshTimer(intervalMs?: number) {
  startSyncTimer(intervalMs);
}
/**
 * Get cached admin ID
 */
export function getCachedAdminId(): string | null {
  if(!cachedAdminId) {
    return null;
  }
  return cachedAdminId;
}

/**
 * Clear cached admin ID (called on logout)
 */
export function clearAdminId() {
  cachedAdminId = null;
  stopSyncTimer();
}

/**
 * Start periodic sync timer
 */
export function startSyncTimer(intervalMs?: number) {
  if (typeof window !== 'undefined' && typeof process === 'undefined') {
    console.log("⚠️ Skipping sync operations - running in web browser");
    return;
  }
  // Clear any existing timer
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  // Use provided interval or default
  const syncIntervalMs = intervalMs || SYNC_INTERVAL_MS;
  console.log(`🔄 Starting sync timer with interval: ${syncIntervalMs}ms (${syncIntervalMs / 60000} minutes)`);
  
  syncInterval = setInterval(() => {
    performPeriodicSync();
  }, syncIntervalMs);
}

/**
 * Stop periodic sync timer
 */
export function stopSyncTimer() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Perform periodic sync operation
 */
async function performPeriodicSync() {
  // Check current API mode - don't sync if offline
  const currentApiMode = getGlobalApiMode();
  if (currentApiMode === 'offline' ) {
    console.log('⏸️ Skipping periodic sync - system is in offline mode');
    return;
  }
  
  console.log(`🔄 Performing periodic sync in ${currentApiMode} mode`);
  
  try {
    // Perform bidirectional sync
    await performOnlineSync();
    await performLocalToOnlineSync();
    
  } catch (error) {
    console.error('❌ Periodic sync failed:');
  }
}

/**
 * Download and import dump file
 */
async function downloadAndImportDumpFile(downloadUrl: string, adminId: string): Promise<void> {
  try {
    // Setup dump directory and file path
    const dumpsDir = ''; //path.join(__dirname, '../dumps');
    if (!fs.existsSync(dumpsDir)) {
      fs.mkdirSync(dumpsDir, { recursive: true });
    }
    
    // Download file
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download dump file: ${response.status}`);
    }
    
    // Save file with timestamp
    const parts = downloadUrl.split("-");
    const timestampWithExt = parts[parts.length - 1]; // "1752318985196.json.gz"
    const fileTimestamp = parseInt(timestampWithExt.split(".json.gz")[0]);
    const buffer = await response.arrayBuffer();
    const fileName = `dump-${adminId}-${fileTimestamp}.json.gz`;
    const filePath = path.join(dumpsDir, fileName);
    
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    // Create sync dump payload using shared helper
    const latestSyncTime = new Date(fileTimestamp).toISOString();
    
    const syncDumpPayload = {
      downloadUrl: `file://${filePath}`,
      latestSyncTime,
      id: adminId,
      status: SYNC_STATUS_OFFLINE
    };
    console.log('syncDumpPayload', syncDumpPayload);
    // const importResponse = await makeLocalSyncDumpCall(syncDumpPayload);
    // console.log(importResponse);
    
    // if (importResponse) {
      
      // Clean up dump file after successful import using shared function
      // if (importResponse.success == true) {
        await makeOnlinePointifyRequest(`/sync/${adminId}`, {
          method: 'DELETE',
          headers: SYNC_HEADERS,
          body: JSON.stringify({ id: adminId, latestSyncTime,fileName})
        });
        // const removed = safeRemoveFile(filePath);
      // }
    // } 
  } catch (error) {
    console.error('❌ Error downloading/importing dump file:', error);
  }
}

/**
 * Safely remove a file
 */
function safeRemoveFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error removing file:', error);
    return false;
  }
}

// Initialize network status monitoring

// Listen for offline event
networkMonitor.on('offline', () => {

  // ADD YOUR OFFLINE LOGIC HERE
  // This is where you can add whatever you need to do when network goes offline
  // Examples:
  // - Switch database modes
  // - Pause sync operations
  // - Enable local-only features
  // - Notify services
  // - Update global flags

  handleOfflineStatus();
});

// Listen for online event
networkMonitor.on('online', () => {

  // ADD YOUR ONLINE LOGIC HERE
  // This is where you can add whatever you need to do when network comes back online
  // Examples:
  // - Resume sync operations
  // - Switch back to online mode
  // - Flush cached data
  // - Notify services
  // - Update global flags

  handleOnlineStatus();
});

// Listen for status changes
networkMonitor.on('statusChange', (status, previousStatus) => {

  // ADD YOUR STATUS CHANGE LOGIC HERE
  // This fires for any status change (offline→online or online→offline)

  handleStatusChange(status, previousStatus);
});

// Your custom offline handler function
async function handleOfflineStatus() {

  // Example: Set global offline flag
  // global.isOfflineMode = true;

  // Example: Notify other services
  // serviceManager.switchToOfflineMode();

  // Example: Pause background tasks
  // backgroundTaskManager.pauseAll();

  // Example: Switch to local database
  // databaseManager.useLocalDatabase();
}

/**
 * Perform online sync by calling online sync endpoint
 * Then make local call with response data
 */
async function performOnlineSync() {
  const adminId = getCachedAdminId();
  if (!adminId) return;
 
  await performSyncOperation(
    `/sync/${adminId}`,
    makeOnlinePointifyRequest,
    async (syncResponse: any, adminId: string) => {
      // Check if we have a downloadUrl that needs to be downloaded
      console.log('syncResponse', syncResponse);
      if (syncResponse.downloadUrl && syncResponse.downloadUrl.startsWith('http')) {
        await downloadAndImportDumpFile(syncResponse.downloadUrl, adminId);
      }  
      // else {
      //   // Direct payload for local API call
      //   console.log(
      //     syncResponse,
      //   )
      //   const dumpPayload = createSyncDumpPayload(syncResponse, adminId);
      //   await makeLocalSyncDumpCall(dumpPayload);
      // }
    },
    'online sync'
  );
}

/**
 * Make local call to /sync/dump endpoint
 */
async function makeLocalSyncDumpCall(payload: any) {
  try {
    const response = await makeLocalPointifyRequest('/sync/dump', {
      method: 'POST',
      headers: SYNC_HEADERS,
      body: JSON.stringify(payload)
    });

    return response;

  } catch (error) {
    console.error('🚨 Local sync dump error:', error);
    throw error;
  }
}

/**
 * Perform local-to-online sync (opposite flow)
 * Call local /sync/:id then online /sync/dump
 */
async function performLocalToOnlineSync() {
  const adminId = getCachedAdminId();
  if (!adminId) return;

  await performSyncOperation(
    `/sync/${adminId}?source=local`,
    makeLocalPointifyRequest,
    async (syncResponse: any, adminId: string) => {
      const dumpPayload = createSyncDumpPayload(syncResponse, adminId);
      const onlineResponse = await makeOnlineFormDataSyncDumpCall(dumpPayload);
      if(onlineResponse.success == true) {
        await removeSyncDumpFile(syncResponse.downloadUrl);
      }
    },
    'local-to-online sync'
  );
}

/**
 * Make online call to /sync/dump endpoint
 */




// Your custom online handler function
async function handleOnlineStatus() {
  console.log("handleOnlineStatus")
  await performOnlineSync();
  await performLocalToOnlineSync();
}

// Your custom status change handler function
function handleStatusChange(status: string, previousStatus: string) {
  // PUT YOUR STATUS CHANGE LOGIC HERE

  // Example: Log to database
  // await db.networkLogs.create({
  //   status,
  //   previousStatus,
  //   timestamp: new Date()
  // });

  // Example: Broadcast to clients
  // if (global.io) {
  //   global.io.emit('networkStatus', { status, timestamp: new Date() });
  // }
}

// Export functions if needed elsewhere
export { handleOfflineStatus, handleOnlineStatus, handleStatusChange };


function removeSyncDumpFile(downloadUrl: any) {
  return new Promise<void>((resolve, reject) => {
    fs.unlink(downloadUrl, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
