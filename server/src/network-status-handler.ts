import { networkMonitor } from './network-monitor.js';
import { makeOnlinePointifyRequest, makeLocalPointifyRequest, getGlobalApiMode, makeOnlineFormDataSyncDumpCall, setGlobalApiMode, isElectron, setInternetAvailable } from './config.js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const __dirname = path.dirname(process.argv[1]);
/**
 * Network Status Handler - Single file to handle network status changes
 * This is where network offline/online events are detected and processed
 */

// In-memory storage for admin ID to avoid repeated API calls
let cachedAdminId: string | null = null;


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
async function localToOnlineSync(adminId: string, force = false) {
  let response: any  = await makeLocalPointifyRequest(
    `/sync/${adminId}?source=local&force=${force}`,
    {
      method: 'GET',
      headers: SYNC_HEADERS
    }
  );

  if (response && response.status === SYNC_STATUS_SUCCESS) {
    const dumpPayload = createSyncDumpPayload(response, adminId);
    const onlineResponse = await makeOnlineFormDataSyncDumpCall(dumpPayload);
    if(onlineResponse.success == true) {
      await removeSyncDumpFile(response.downloadUrl);
    }
  }
}



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
}



/**
 * Download and import dump file
 */
async function downloadAndImportDumpFile(downloadUrl: string, adminId: string): Promise<void> {
  try {
    // Setup dump directory and file path
    const dumpsDir = path.join(__dirname, '../dumps');
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
    //export to local 
    console.log('export to local', JSON.stringify({downloadUrl,latestSyncTime,id:adminId,status:SYNC_STATUS_OFFLINE}));
    await makeLocalPointifyRequest('/sync/dump', {
      method: 'POST',
      body: JSON.stringify({downloadUrl,latestSyncTime,id:adminId,status:SYNC_STATUS_OFFLINE})
    })
    await makeOnlinePointifyRequest(`/sync/${adminId}`, {
      method: 'DELETE',
      headers: SYNC_HEADERS,
      body: JSON.stringify({ id: adminId, latestSyncTime,fileName})
    });
  } catch (error) {
    console.error('❌ Error downloading/importing dump file:', error);
  }
}

// Initialize network status monitoring

// Listen for offline event
networkMonitor.on('offline', () => {
  console.log('Network is offline');
  setGlobalApiMode("offline")
  setInternetAvailable(false)
  handleOfflineStatus();
});

// Listen for online event
networkMonitor.on('online', () => {
  console.log('Network is back online');
  setInternetAvailable(true)
  setGlobalApiMode("online")
  performDataSync();

  handleOnlineStatus();
});

// Listen for status changes
networkMonitor.on('statusChange', (status, previousStatus) => {

  handleStatusChange(status, previousStatus);
});

// Your custom offline handler function
async function handleOfflineStatus() {
}

/**
 * Perform online sync by calling online sync endpoint
 * Then make local call with response data
 */
async function performDataSync(force = false) {
  const currentApiMode = getGlobalApiMode();
  if (currentApiMode === 'offline' ) {
    console.log('⏸️ Skipping periodic sync - system is in offline mode');
    return;
  }
  if (!isElectron()) {
    console.log('⏸️ Skipping periodic sync - not in Electron environment');
    return;
  }
  const adminId = getCachedAdminId();
  console.log('adminId', adminId);
  if (!adminId) return;
  const syncResponse:any = await makeOnlinePointifyRequest(`/sync/${adminId}?force=${force}`, { method: 'GET', headers: SYNC_HEADERS });
  console.log('syncResponse', syncResponse);
  localToOnlineSync(adminId,force);
  console.log('performSyncOperation ', adminId);
  if (syncResponse.downloadUrl && syncResponse.downloadUrl.startsWith('http')) {
    await downloadAndImportDumpFile(syncResponse.downloadUrl, adminId);
  }
}


// /**
//  * Perform local-to-online sync (opposite flow)
//  * Call local /sync/:id then online /sync/dump
//  */
// async function performLocalToOnlineSync(force = false) {
//   const adminId = getCachedAdminId();
//   if (!adminId) return;

//   await performSyncOperation(
//     `/sync/${adminId}?source=local`,
//     makeLocalPointifyRequest,
//     async (syncResponse: any, adminId: string) => {
//       const dumpPayload = createSyncDumpPayload(syncResponse, adminId);
//       const onlineResponse = await makeOnlineFormDataSyncDumpCall(dumpPayload);
//       if(onlineResponse.success == true) {
//         await removeSyncDumpFile(syncResponse.downloadUrl);
//       }
//     },
//     'local-to-online sync',
//     force
//   );
// }

// Your custom online handler function
async function handleOnlineStatus() {
  console.log("handleOnlineStatus")
}

// Your custom status change handler function
function handleStatusChange(status: string, previousStatus: string) {
  setGlobalApiMode(status as any)
}


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

// Export functions if needed elsewhere
export { handleOfflineStatus, handleOnlineStatus, handleStatusChange,performDataSync};
