// src/api/pointify.ts
import FormData from 'form-data';
import fs from 'fs';
import fetchh from 'node-fetch';

// Constants
export const POINTIFY_API_BASE: string = process.env.POINTIFY_OFFLINE_API_URL;
export const POINTIFY_ONLINE_API_BASE = process.env.POINTIFY_API_URL || 'https://staging.pointifypos.com';

// Global API mode setting
let globalApiMode: 'online' | 'offline' | 'hybrid' = 'online';
let internetAvailable = true;
export function setInternetAvailable(status: false | true) {
  internetAvailable = status;
}
export function getInternetAvailable(): false | true {
  return internetAvailable;
}

// Functions to manage global API mode
export function setGlobalApiMode(mode: 'online' | 'offline' | 'hybrid') {
  console.log(`🌐 Global API mode set to: ${mode}`);
  if (internetAvailable == false) {
    globalApiMode = "offline"
    return;
  }
  globalApiMode = mode;
}
export function isElectron() {
  return !!(process.versions && process.versions.electron);
}

export function getGlobalApiMode(): 'online' | 'offline' | 'hybrid' {
  return globalApiMode;
}

// Types
export interface PointifyRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export type PointifyResponse =
  | Record<string, unknown>
  | Blob
  | { success: boolean; offline?: boolean; message?: string }
  | null | [];
// Normalize headers helper
const isWriteMethod = (options: PointifyRequestOptions = {}): boolean => {
  const method = String(options.method || 'GET').toUpperCase();
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
};
const normalizeHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
  return Object.keys(headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = headers[key];
    return acc;
  }, {} as Record<string, string>);
};
export async function makeOnlineFormDataSyncDumpCall(payload: { downloadUrl?: any; latestSyncTime: any; id: any; status: any; filePath?: any; }) {
  try {

    const form = new FormData();
    form.append('file', fs.createReadStream(payload.downloadUrl));
    form.append('latestSyncTime', payload.latestSyncTime);
    form.append('id', payload.id);
    form.append('status', payload.status);

    const res = await fetchh(`${POINTIFY_ONLINE_API_BASE}/sync/dump/online`, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form
    });
    return await res.json();

  } catch (error) {
    // console.log('🚨 Online sync dump error:', error);
    return {
      success: false,
      offline: false,
      message: `sync dump error`,
    };
  }
}
// Main online request
export async function makeOnlinePointifyRequest(
  endpoint: string,
  options: PointifyRequestOptions = {}
): Promise<PointifyResponse> {
  const url = `${POINTIFY_ONLINE_API_BASE}${endpoint}`;
  console.log(`🌐 Attempting online request for ${url}`);
  const headers = normalizeHeaders(options.headers);

  if (!headers['content-type']) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData: any = { success: false, offline: false, message: `HTTP error ${response.status}`, httpStatus: response.status };
    try {
      const body = await response.json();
      errorData = { ...body, success: false, offline: false, httpStatus: response.status };
    } catch { /* keep default */ }
    // Surface the real upstream rejection — otherwise it gets masked by the
    // graceful-fallback path and the caller can't tell why a write failed.
    console.log(`🛑 Upstream ${options.method || 'GET'} ${url} -> ${response.status}:`, JSON.stringify(errorData));
    return errorData;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      console.warn(`Failed to parse JSON body:`, error);
      return {};
    }
  }

  if (
    contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
    contentType.includes('application/octet-stream') ||
    contentType.includes('application/excel')
  ) {
    return await response.blob();
  }

  return { success: true };
}

// Local request
export async function makeLocalPointifyRequest(
  endpoint: string,
  options: PointifyRequestOptions = {}
): Promise<PointifyResponse> {
  const url = `${POINTIFY_API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  let response: Response;
  console.log(url, headers)
  try {
    response = await fetch(url, { ...options, headers });
  } catch (fetchError: any) {
    console.log(`🚨 Local API request failed: ${fetchError.message}`);
    throw fetchError;
  }
  console.log(`🌐 Attempting local request for ${response}`);
  if (!response) {
    throw new Error(`Local API request failed: no response for ${url}`);
  }

  return await response.json();
}

// Smart request with fallback logic using global API mode
export async function makePointifyRequest(
  endpoint: string,
  options: PointifyRequestOptions = {}
): Promise<PointifyResponse> {

  const apiMode = getGlobalApiMode();
  console.log(`🌐 Making request for ${endpoint} using API mode: ${apiMode}`);

  switch (apiMode) {
    case 'online':
      // Online only - try online API, fallback to graceful if fails
      try {
        let response: any = await makeOnlinePointifyRequest(endpoint, options);
        console.log(`🌐 Online API response for ${endpoint}:`);
        if (response.success === false) {
          // A definitive upstream HTTP error (4xx/5xx) on a write must NOT be
          // masked as a fake-success []. Surface it so the route can return the
          // real status/message and the cashier knows the sale didn't save.
          if (isWriteMethod(options) && response.httpStatus) {
            return response;
          }
          try {
            let localresponse = await makeLocalPointifyRequest(endpoint, options);
            return localresponse;
          } catch (localError) {
            console.log(`🏠 Local API error for ${endpoint}, using graceful fallback...`);
            return gracefulFallback(endpoint);
          }
        }
        return response;
      } catch (onlineError) {
        console.log(`🌐 Online API error for ${endpoint}, using graceful fallback... ${onlineError}`);
        try {
          return await makeLocalPointifyRequest(endpoint, options);
        } catch (localError) {
          console.log(`🏠 Local API error for ${endpoint}, using graceful fallback...`);
          return gracefulFallback(endpoint);
        }
      }

    case 'offline':
      // Offline only - try local API, fallback to graceful if fails
      try {
        return await makeLocalPointifyRequest(endpoint, options);
      } catch (localError) {
        console.log(`🏠 Local API error for ${endpoint}, using graceful fallback...`);
        return gracefulFallback(endpoint);
      }

    case 'hybrid':
      try {
        let response: any = await makeOnlinePointifyRequest(endpoint, options);
        console.log(`🌐 Online API response for ${endpoint}:`);
        if (response.success === false) {
          // Don't mask a definitive upstream write error as fake-success [].
          if (isWriteMethod(options) && response.httpStatus) {
            return response;
          }
          try {
            let localresponse = await makeLocalPointifyRequest(endpoint, options);
            return localresponse;
          } catch (localError) {
            console.log(`🏠 Local API error for ${endpoint}, using graceful fallback...`);
            return gracefulFallback(endpoint);
          }
        }
        return response;
      } catch (onlineError) {
        console.log(`🌐 Online API error for ${endpoint}, trying local fallback...`);
        try {
          return await makeLocalPointifyRequest(endpoint, options);
        } catch (localError) {
          console.log(`🏠 Local API error for ${endpoint}, using graceful fallback...`);
          return gracefulFallback(endpoint);
        }
      }
    default:
      // Hybrid - try online first, then local, then graceful fallback
      try {
        return await makeOnlinePointifyRequest(endpoint, options);
      } catch (onlineError) {
        console.log(`🌐 Online API error for ${endpoint}, trying local fallback...`);
        try {
          return await makeLocalPointifyRequest(endpoint, options);
        } catch (localError) {
          console.log(`🏠 Local API error for ${endpoint}, using graceful fallback...`);
          return gracefulFallback(endpoint);
        }
      }
  }
}

// Fallback for offline or multi-failure
const gracefulFallback = (endpoint: string): PointifyResponse => {
  if (endpoint.includes('/auth/admin/')) return null;
  return [];

};
