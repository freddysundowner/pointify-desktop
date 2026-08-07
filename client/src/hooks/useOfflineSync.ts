import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage, getActiveScopeId } from '@/lib/offline-storage';
import { apiCall } from '@/lib/api-config';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

// Fired right after a login so the mounted sync hook flushes immediately
// instead of waiting for the 30s periodic timer.
export const OFFLINE_FLUSH_EVENT = 'offline-sync:flush';

/**
 * Called right after a successful login (admin or attendant). Checks the
 * signed-in user's own offline queue and, if anything is still waiting to
 * send, shows a brief notice with the count and asks the mounted sync hook
 * to flush right away (when online).
 *
 * Safe to fire-and-forget: any failure here must never block the login flow.
 */
export async function announcePendingOfflineSales() {
  try {
    // offlineStorage re-resolves the active identity scope on every call, so
    // this reads the queue belonging to the user who just signed in.
    const scope = getActiveScopeId();
    const items = (await offlineStorage.getQueuedItems()) as QueuedSyncItem[];
    const waiting = items.filter(
      (i) =>
        (i.status === 'pending' || i.status === 'syncing') &&
        (!(i as any).owner || (i as any).owner === scope),
    );

    if (waiting.length > 0) {
      const sales = waiting.filter((i) => i.type === 'transaction').length;
      const title =
        sales > 0
          ? `${sales} offline sale${sales === 1 ? '' : 's'} waiting to send`
          : `${waiting.length} offline change${waiting.length === 1 ? '' : 's'} waiting to send`;
      toast({
        title,
        description:
          typeof navigator !== 'undefined' && navigator.onLine === false
            ? "They'll be sent automatically once you're back online."
            : 'Sending them now…',
        duration: 8000,
      });
    }

    // Ask the mounted sync hook to flush right away (it no-ops while offline).
    // Small delay so the post-login UI (and the hook) has a moment to mount.
    if (waiting.length > 0 && typeof window !== 'undefined') {
      setTimeout(() => window.dispatchEvent(new Event(OFFLINE_FLUSH_EVENT)), 1000);
    }
  } catch (err: any) {
    console.warn('Could not check pending offline sales after login:', err?.message || err);
  }
}

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
  recoveredFromLegacy?: boolean;
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

  // Rescue sales stranded in the pre-isolation shared database. Attempted once
  // per signed-in identity per page load: at mount (if already signed in) and
  // again on each poll tick, so a user who signs in after the app loaded still
  // picks up their recovery pass. The storage routine itself is idempotent and
  // exits early once the legacy database is gone.
  const legacyRecoveredFor = useRef<string | null>(null);
  const maybeRecoverLegacy = useCallback(async () => {
    const scope = getActiveScopeId();
    if (scope === 'anon' || legacyRecoveredFor.current === scope) return;
    legacyRecoveredFor.current = scope;
    try {
      const recovered = await offlineStorage.recoverLegacyQueue();
      if (recovered > 0) {
        await checkPending();
      }
    } catch (err: any) {
      console.warn('Legacy offline data recovery failed:', err?.message || err);
    }
  }, [checkPending]);

  const syncNow = useCallback(async () => {
    if (syncInProgress.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    let syncedAny = false;

    try {
      // Items stranded in 'syncing' by a crash/reload are ambiguous — the POST
      // may or may not have landed. Park them for manual review instead of
      // auto-replaying (which could double-post a sale).
      const stranded = await offlineStorage.quarantineStaleInFlight();
      if (stranded > 0) {
        console.warn(`Parked ${stranded} in-flight sync item(s) from a previous session for review`);
      }

      const queue = await offlineStorage.getSyncQueue();
      if (queue.length === 0) {
        return;
      }

      // Temp->real id mappings discovered as offline-created customers/items
      // sync. Loaded from storage so a sale deferred in an earlier pass can still
      // be resolved, then topped up in-memory as we go through this pass.
      const idMap: Record<string, string> = await offlineStorage.getIdMap().catch(() => ({}));
      const resolveId = (id: any) => (isTempId(id) && idMap[id] ? idMap[id] : id);

      // The offline database is already scoped per identity, so everything in
      // this queue should belong to the active user. This guard is
      // defense-in-depth: never replay an item stamped with a different
      // account's identity under the current token — leave it pending for its
      // owner's next session instead.
      const activeScope = getActiveScopeId();

      for (const item of queue) {
        if ((item as any).owner && (item as any).owner !== activeScope) {
          console.warn('Skipping sync item owned by another account:', item.id);
          continue;
        }
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

        // Claim the item (pending -> syncing) before POSTing. If the claim
        // fails, another flush already owns it — skip to avoid a double post.
        const claimed = await offlineStorage.claimSyncItem(item.id).catch(() => false);
        if (!claimed) {
          console.warn('Sync item already claimed elsewhere, skipping:', item.id);
          continue;
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
              // The POST succeeded but we couldn't find the new id in the
              // response. Retrying would create a duplicate server record, so
              // park it for manual review instead. Don't mark complete either —
              // any sale depending on this temp id would defer forever.
              console.warn('Created on server but no real id in response; parking for review:', item.id);
              await offlineStorage.parkSyncItem(item.id);
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
    maybeRecoverLegacy().finally(() => checkPending());

    // Give the network a moment to stabilize after reconnect before flushing.
    const handleOnline = () => {
      setTimeout(() => syncNow(), 1500);
    };

    // Post-login immediate flush request (see announcePendingOfflineSales).
    const handleFlushRequest = () => {
      checkPending();
      if (typeof navigator === 'undefined' || navigator.onLine) {
        syncNow();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener(OFFLINE_FLUSH_EVENT, handleFlushRequest);
    // Periodic flush also acts as backoff for items left 'pending' after a failure.
    const interval = setInterval(() => {
      maybeRecoverLegacy();
      checkPending();
      if (typeof navigator === 'undefined' || navigator.onLine) {
        syncNow();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(OFFLINE_FLUSH_EVENT, handleFlushRequest);
      clearInterval(interval);
    };
  }, [checkPending, syncNow, maybeRecoverLegacy]);

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
