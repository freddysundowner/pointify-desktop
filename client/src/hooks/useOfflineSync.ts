import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { apiCall } from '@/lib/api-config';
import { queryClient } from '@/lib/queryClient';

const ENDPOINTS: Record<string, string> = {
  transaction: '/api/sales',
  product_update: '/api/product',
  customer: '/api/customers',
};

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  const checkPending = useCallback(async () => {
    try {
      const queue = await offlineStorage.getSyncQueue();
      setPendingCount(queue.length);
      return queue.length;
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
          // Unknown type — drop it so it can't wedge the queue.
          try {
            await offlineStorage.markSyncComplete(item.id);
          } catch (err: any) {
            console.warn('Could not drop unknown sync item:', item.id, err?.message || err);
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

  return { pendingCount, isSyncing, syncNow, checkPending };
}
