import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { apiCall } from '@/lib/api-config';
import { queryClient } from '@/lib/queryClient';

const ENDPOINTS: Record<string, string> = {
  transaction: '/api/sales',
  product_update: '/api/product',
  customer: '/api/customers',
};

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
        try {
          await apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify(item.data),
          });
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
