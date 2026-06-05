import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { apiCall } from '@/lib/api-config';

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
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const queue = await offlineStorage.getSyncQueue();
      if (queue.length === 0) {
        setIsSyncing(false);
        syncInProgress.current = false;
        return;
      }

      for (const item of queue) {
        try {
          if (item.type === 'transaction') {
            await apiCall('/api/sales', {
              method: 'POST',
              body: JSON.stringify(item.data),
            });
            await offlineStorage.markSyncComplete(item.id);
          } else if (item.type === 'product_update') {
            await apiCall('/api/product', {
              method: 'POST',
              body: JSON.stringify(item.data),
            });
            await offlineStorage.markSyncComplete(item.id);
          } else if (item.type === 'customer') {
            await apiCall('/api/customers', {
              method: 'POST',
              body: JSON.stringify(item.data),
            });
            await offlineStorage.markSyncComplete(item.id);
          }
        } catch {
          await offlineStorage.markSyncFailed(item.id);
        }
      }
    } catch (err) {
      console.error('Sync queue flush failed:', err);
    } finally {
      await checkPending();
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [checkPending]);

  useEffect(() => {
    checkPending();

    const handleOnline = () => {
      setTimeout(() => syncNow(), 1500);
    };

    window.addEventListener('online', handleOnline);
    const interval = setInterval(checkPending, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [checkPending, syncNow]);

  return { pendingCount, isSyncing, syncNow, checkPending };
}
