import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { apiCall } from '@/lib/api-config';
import { queryClient } from '@/lib/queryClient';

const ENDPOINTS: Record<string, string> = {
  transaction: '/api/sales',
  product: '/api/product',
  product_update: '/api/product',
  customer: '/api/customers',
};

// Offline-created customers/items get a placeholder id until they sync.
const isTempId = (id: any): id is string =>
  typeof id === 'string' && id.startsWith('temp_');

export interface QueuedSyncItem {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [queuedItems, setQueuedItems] = useState<QueuedSyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Loads the whole reviewable queue (pending + in-flight + failed) and keeps the
  // count badges in sync. Returns the pending count so the flush logic can bail
  // early when there is nothing to push.
  const checkPending = useCallback(async () => {
    try {
      const items = (await offlineStorage.getQueuedItems()) as QueuedSyncItem[];
      setQueuedItems(items);
      const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing').length;
      setPendingCount(pending);
      setFailedCount(items.filter((i) => i.status === 'failed').length);
      return pending;
    } catch {
      return 0;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncInProgress.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    let syncedAny = false;

    try {
      const queue = await offlineStorage.getSyncQueue();
      if (queue.length === 0) {
        return;
      }

      // Temp->real id mappings discovered as offline-created customers/items
      // sync. Loaded from storage so a sale deferred in an earlier pass can still
      // be resolved, then topped up in-memory as we go through this pass.
      const idMap: Record<string, string> = await offlineStorage.getIdMap().catch(() => ({}));
      const resolveId = (id: any) => (isTempId(id) && idMap[id] ? idMap[id] : id);

      for (const item of queue) {
        const endpoint = ENDPOINTS[item.type];
        if (!endpoint) {
          // Unknown type — quarantine it (park as 'failed' + visible in the
          // review panel) rather than silently dropping, so a malformed or
          // future queue entry is never lost without the cashier seeing it.
          try {
            await offlineStorage.markSyncFailed(item.id);
          } catch (err: any) {
            console.warn('Could not quarantine unknown sync item:', item.id, err?.message || err);
          }
          continue;
        }

        // A sale may reference a customer/custom item that was also created
        // offline. Swap those placeholder ids for the real ids assigned when the
        // dependency synced. If a placeholder is still unresolved, defer the sale
        // (retry next pass) rather than POST an id the server can't resolve.
        let payload = item.data;
        if (item.type === 'transaction') {
          payload = { ...item.data };
          if (payload.customerId) payload.customerId = resolveId(payload.customerId);
          if (Array.isArray(payload.products)) {
            payload.products = payload.products.map((line: any) => ({
              ...line,
              product: resolveId(line.product),
              inventory: resolveId(line.inventory),
            }));
          }
          const unresolved =
            isTempId(payload.customerId) ||
            (Array.isArray(payload.products) && payload.products.some((l: any) => isTempId(l.product)));
          if (unresolved) {
            console.warn('Deferring sale; offline customer/item not synced yet:', item.id);
            await offlineStorage.markSyncFailed(item.id);
            continue;
          }
        }

        try {
          const res = await apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          // Capture the real id the server assigned to an offline-created
          // customer/item, so dependent sales (this pass or a later one) remap.
          if ((item.type === 'customer' || item.type === 'product') && item.data?.tempId) {
            let realId: string | undefined;
            try {
              const json = await res.clone().json();
              realId = json?._id || json?.id || json?.customer?._id || json?.product?._id || json?.data?._id;
            } catch { /* response body not JSON — fall through to the no-id guard */ }

            if (!realId) {
              // The POST appeared to succeed but we couldn't find the new id in
              // the response. Don't mark complete — otherwise any sale that
              // depends on this temp id would defer forever. Retry instead so a
              // later pass (or a manual review) can resolve it.
              console.warn('Synced customer/product but no real id in response; will retry:', item.id);
              await offlineStorage.markSyncFailed(item.id);
              continue;
            }

            idMap[item.data.tempId] = realId;
            await offlineStorage.saveIdMapping(item.data.tempId, realId).catch(() => {});
            if (item.type === 'customer') {
              await offlineStorage.removeCustomer(item.data.tempId).catch(() => {});
            } else {
              await offlineStorage.removeProduct(item.data.tempId).catch(() => {});
            }
          }

          await offlineStorage.markSyncComplete(item.id);
          syncedAny = true;
        } catch (err: any) {
          // Keep retryable (stays 'pending') until it exhausts its attempts.
          console.warn('Sync item failed, will retry:', item.id, err?.message || err);
          await offlineStorage.markSyncFailed(item.id);
        }
      }
    } catch (err: any) {
      console.error('Sync queue flush failed:', err?.message || err, err?.name);
    } finally {
      await checkPending();
      setIsSyncing(false);
      syncInProgress.current = false;

      // Refresh cached server data so balances/stock reflect what we just pushed.
      if (syncedAny) {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = String(query.queryKey[0] || '');
            return (
              key.includes('/api/sales') ||
              key.includes('/api/analysis') ||
              key.includes('/api/product') ||
              key === 'customers' ||
              key === 'transactions'
            );
          },
        });
      }
    }
  }, [checkPending]);

  // Cashier-initiated recovery: re-arm a parked 'failed' item and immediately
  // attempt a flush so they get instant feedback.
  const retryItem = useCallback(async (id: string) => {
    try {
      await offlineStorage.retrySyncItem(id);
    } catch (err: any) {
      console.warn('Could not re-arm sync item:', id, err?.message || err);
    }
    await checkPending();
    await syncNow();
  }, [checkPending, syncNow]);

  // Cashier-initiated discard: permanently drop a queued item they don't want to
  // recover (e.g. a duplicate or a mistaken sale).
  const discardItem = useCallback(async (id: string) => {
    try {
      await offlineStorage.discardSyncItem(id);
    } catch (err: any) {
      console.warn('Could not discard sync item:', id, err?.message || err);
    }
    await checkPending();
  }, [checkPending]);

  useEffect(() => {
    checkPending();

    // Give the network a moment to stabilize after reconnect before flushing.
    const handleOnline = () => {
      setTimeout(() => syncNow(), 1500);
    };

    window.addEventListener('online', handleOnline);
    // Periodic flush also acts as backoff for items left 'pending' after a failure.
    const interval = setInterval(() => {
      checkPending();
      if (typeof navigator === 'undefined' || navigator.onLine) {
        syncNow();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [checkPending, syncNow]);

  return {
    pendingCount,
    failedCount,
    queuedItems,
    isSyncing,
    syncNow,
    checkPending,
    retryItem,
    discardItem,
  };
}
