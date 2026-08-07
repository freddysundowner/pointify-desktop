// Offline Storage Layer for POS System
//
// Multi-user isolation: on shared tills, several attendants (and the admin) use
// the same browser. All cached data (products, customers, transactions, the
// sync queue, settings/idMap) therefore lives in a PER-IDENTITY IndexedDB
// database — `pos-offline-db::admin:<id>` / `pos-offline-db::attendant:<id>` —
// derived from whoever is currently signed in. Switching users switches the
// database, so one account can never see (or sync under) another account's
// data. The offline credential vault is the one intentional exception: it is a
// separate GLOBAL database, because it must be readable before anyone is
// logged in (that's what offline login checks against) and it only stores
// salted verifiers, never another user's business data.
import { openDB, deleteDB, DBSchema, IDBPDatabase } from 'idb';

// Routine storage diagnostics are dev-only so production consoles stay quiet.
const debugLog: (...args: any[]) => void = (import.meta as any).env?.DEV
  ? console.log.bind(console)
  : () => {};

// Define the database schema
interface POSDatabase extends DBSchema {
  products: {
    key: string;
    value: any;
    indexes: {
      'by-name': string;
      'by-barcode': string;
      'by-category': string;
    };
  };

  customers: {
    key: string;
    value: any;
    indexes: {
      'by-phone': string;
      'by-email': string;
    };
  };

  transactions: {
    key: string;
    value: any;
    indexes: {
      'by-date': string;
      'by-status': string;
      'by-sync-status': string;
    };
  };

  settings: {
    key: string;
    value: any;
  };

  sync_queue: {
    key: string;
    value: {
      id: string;
      type: 'transaction' | 'customer' | 'product' | 'product_update';
      data: any;
      timestamp: number;
      retries: number;
      status: 'pending' | 'syncing' | 'synced' | 'failed';
      // In-flight claim bookkeeping: which session claimed it and when, so a
      // concurrent flush (another tab) can tell an active claim from an
      // abandoned one (crash/reload) and only quarantine expired claims.
      claimedBy?: string;
      claimedAt?: number;
      /** Scope id of the identity that queued this item (defense-in-depth). */
      owner?: string;
      /**
       * Set when the item was rescued from the pre-isolation shared database.
       * Lets the review panel explain why an unfamiliar sale appeared, and why
       * it needs a manual retry (it is never auto-replayed).
       */
      recoveredFromLegacy?: boolean;
    };
    indexes: {
      'by-type': string;
      'by-status': string;
    };
  };
}

interface AuthVaultDatabase extends DBSchema {
  auth: {
    key: string;
    value: OfflineCredential;
  };
}
export interface OfflineCredential {
  id: string;
  role: 'admin' | 'attendant';
  identifier: string;
  salt: string;
  verifier: string;
  token: string;
  profile: any;
  shopData?: any;
  extra?: any;
  updatedAt: number;
}

const LEGACY_DB_NAME = 'pos-offline-db';

// Identifies this page load (tab/session) as the owner of in-flight sync
// claims. A reload gets a fresh id, so claims from a previous life are never
// mistaken for our own live requests.
export const SYNC_SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

// How long an in-flight claim is trusted before another session may treat it
// as abandoned. Must comfortably exceed the longest plausible POST round-trip.
export const SYNC_CLAIM_LEASE_MS = 2 * 60 * 1000;

class OfflineStorage {
  private db: IDBPDatabase<POSDatabase> | null = null;

  private version = 1;

  async init(): Promise<void> {
    await this.ensureDb();
  }

  // Products operations
  async saveProducts(products: any[]): Promise<void> {
    const db = await this.ensureDb();

    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    for (const product of products) {
      await store.put({
        ...product,
        lastUpdated: Date.now(),
        syncStatus: 'synced'
      });
    }

    await tx.done;
    await this.touchLastSync();
    debugLog(`Saved ${products.length} products to offline storage`);
  }

  async getProducts(): Promise<any[]> {
    const db = await this.ensureDb();
    return await db.getAll('products');
  }

  async searchProducts(query: string): Promise<any[]> {
    const db = await this.ensureDb();

    const products = await db.getAll('products');
    const searchTerm = query.toLowerCase();

    return products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm) ||
      product.barcode?.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm)
    );
  }

  async getProductByBarcode(barcode: string): Promise<any | null> {
    const db = await this.ensureDb();

    const products = await db.getAllFromIndex('products', 'by-barcode', barcode);
    return products.length > 0 ? products[0] : null;
  }

  // Customers operations
  async saveCustomers(customers: any[]): Promise<void> {
    const db = await this.ensureDb();

    const tx = db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');

    for (const customer of customers) {
      await store.put({
        ...customer,
        lastUpdated: Date.now(),
        syncStatus: 'synced'
      });
    }

    await tx.done;
    await this.touchLastSync();
    debugLog(`Saved ${customers.length} customers to offline storage`);
  }

  async getCustomers(): Promise<any[]> {
    const db = await this.ensureDb();
    return await db.getAll('customers');
  }

  async searchCustomers(query: string): Promise<any[]> {
    const db = await this.ensureDb();

    const customers = await db.getAll('customers');
    const searchTerm = query.toLowerCase();

    return customers.filter(customer =>
      customer.name?.toLowerCase().includes(searchTerm) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(searchTerm)
    );
  }

  // Transactions operations
  async saveTransaction(transaction: any, forceQueue = false): Promise<void> {
    const db = await this.ensureDb();

    // Queue for replay whenever the sale didn't reach the server: either the
    // device is offline OR the request failed at the transport layer while the
    // browser still reports online (backend unreachable / flaky WAN). Callers on
    // a caught network error must pass forceQueue=true — otherwise the sale would
    // be stored locally but never added to the sync queue, so it never replays.
    const queueForSync = forceQueue || !navigator.onLine;

    const offlineTransaction = {
      ...transaction,
      id: transaction.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      syncStatus: queueForSync ? 'offline' : 'pending',
      createdOffline: !navigator.onLine
    };

    await db.put('transactions', offlineTransaction);

    if (queueForSync) {
      await this.addToSyncQueue('transaction', offlineTransaction);
    }

    debugLog('Transaction saved to offline storage:', offlineTransaction.id);
  }

  async getTransactions(): Promise<any[]> {
    const db = await this.ensureDb();
    return await db.getAll('transactions');
  }

  async getPendingTransactions(): Promise<any[]> {
    const db = await this.ensureDb();
    return await db.getAllFromIndex('transactions', 'by-sync-status', 'pending');
  }

  // Sync queue operations
  async addToSyncQueue(type: 'transaction' | 'customer' | 'product' | 'product_update', data: any): Promise<void> {
    const db = await this.ensureDb();

    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending' as const,
      // Stamp the creator's identity. The per-scope database already isolates
      // queues, but this lets the flush loop verify (defense-in-depth) that an
      // item is never replayed under a different account's token.
      owner: getActiveScopeId(),
    };

    // Dedupe by the sale's stable client idempotency key so the same
    // transaction can't be queued twice (double-tap, retry re-entry, or two
    // concurrent calls). The check and the insert run inside ONE readwrite
    // transaction: IndexedDB serializes readwrite transactions on the store,
    // so two racing enqueues of the same clientRef can't both observe an
    // empty queue — exactly one row wins. Any existing entry with the same
    // clientRef blocks re-enqueue: 'pending'/'syncing' would double-post,
    // 'synced' already posted (the terminal status is 'synced', not
    // 'completed'), and 'failed' is parked for manual review — re-adding it
    // would duplicate the same sale.
    const clientRef = data?.clientRef;
    const tx = db.transaction('sync_queue', 'readwrite');
    if (clientRef) {
      const existing = await tx.store.getAll();
      if (existing.some((q: any) => q?.data?.clientRef === clientRef)) {
        await tx.done;
        debugLog('Skipping duplicate sync item for clientRef:', clientRef);
        return;
      }
    }
    await tx.store.put(syncItem);
    await tx.done;
    debugLog('Added item to sync queue:', syncItem.id);
  }

  async getSyncQueue(): Promise<any[]> {
    const db = await this.ensureDb();
    return await db.getAllFromIndex('sync_queue', 'by-status', 'pending');
  }

  // Items parked as 'failed' after exhausting their retries. These are no longer
  // picked up by the automatic flush, so the review panel surfaces them for a
  // manual retry or discard.
  async getFailedSyncItems(): Promise<any[]> {
    const db = await this.ensureDb();
    return await db.getAllFromIndex('sync_queue', 'by-status', 'failed');
  }

  // Everything still in the queue (pending, mid-flight, or failed) so the review
  // panel can show the cashier exactly what is waiting and what got stuck.
  async getQueuedItems(): Promise<any[]> {
    const db = await this.ensureDb();
    const all = await db.getAll('sync_queue');
    return all
      .filter((item: any) => ['pending', 'syncing', 'failed'].includes(item.status))
      .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
  }

  // Re-arm a parked 'failed' item for the next flush by resetting its attempt
  // counter and status back to 'pending'.
  async retrySyncItem(syncId: string): Promise<void> {
    const db = await this.ensureDb();
    const item = await db.get('sync_queue', syncId);
    if (item) {
      item.status = 'pending';
      item.retries = 0;
      await db.put('sync_queue', item);
    }
  }

  // Permanently drop a queued item the cashier decides not to recover.
  async discardSyncItem(syncId: string): Promise<void> {
    const db = await this.ensureDb();
    await db.delete('sync_queue', syncId);
  }

  // Claim an item before POSTing it: an atomic compare-and-set inside a single
  // IndexedDB readwrite transaction. Readwrite transactions on the same store
  // serialize, so if two flushes (e.g. two open tabs) race on the same item,
  // exactly one sees 'pending' and wins; the other observes 'syncing' and
  // backs off. The claim records the owning session and a lease timestamp so
  // an abandoned claim (crash/reload) can later be told apart from a live one.
  async claimSyncItem(syncId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction('sync_queue', 'readwrite');
    const item = await tx.store.get(syncId);
    if (!item || item.status !== 'pending') {
      await tx.done;
      return false;
    }
    item.status = 'syncing';
    item.claimedBy = SYNC_SESSION_ID;
    item.claimedAt = Date.now();
    await tx.store.put(item);
    await tx.done;
    return true;
  }

  // Items left in 'syncing' whose claim lease has EXPIRED are ambiguous — the
  // POST may or may not have reached the server before the claiming session
  // died. Park them as 'failed' so they surface in the review panel for a
  // human decision instead of being auto-replayed. Fresh claims held by
  // another live session are left alone (its request may still be in flight).
  // Runs as one readwrite transaction so it can't race a concurrent claim.
  async quarantineStaleInFlight(leaseMs = SYNC_CLAIM_LEASE_MS): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const now = Date.now();
    const tx = this.db.transaction('sync_queue', 'readwrite');
    const inFlight = await tx.store.index('by-status').getAll('syncing');
    let parked = 0;
    for (const item of inFlight) {
      const claimedAt = item.claimedAt ?? 0;
      const expired = now - claimedAt > leaseMs;
      // Own-session 'syncing' items at flush start are also stale: syncNow is
      // serialized per session, so nothing of ours can legitimately be in
      // flight when a new flush begins.
      if (expired || item.claimedBy === SYNC_SESSION_ID) {
        item.status = 'failed';
        await tx.store.put(item);
        parked++;
      }
    }
    await tx.done;
    return parked;
  }

  // Park an item as 'failed' immediately (no retries left), for cases where an
  // automatic retry could duplicate a server record.
  async parkSyncItem(syncId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const item = await this.db.get('sync_queue', syncId);
    if (item) {
      item.status = 'failed';
      await this.db.put('sync_queue', item);
    }
  }

  async markSyncComplete(syncId: string): Promise<void> {
    const db = await this.ensureDb();

    const item = await db.get('sync_queue', syncId);
    if (item) {
      item.status = 'synced';
      await db.put('sync_queue', item);
    }
  }

  // Mark a sync item failed. It stays 'pending' (retryable on the next flush)
  // until it exhausts maxRetries, after which it parks as 'failed' so a single
  // poison item can't block the queue forever.
  async markSyncFailed(syncId: string, maxRetries = 5): Promise<void> {
    const db = await this.ensureDb();

    const item = await db.get('sync_queue', syncId);
    if (item) {
      item.retries += 1;
      item.status = item.retries >= maxRetries ? 'failed' : 'pending';
      await db.put('sync_queue', item);
    }
  }

  /**
   * Open (or reuse) the database for the CURRENT identity. The scope is
   * recomputed on every call, so the first storage operation after a
   * login/logout/user-switch automatically lands in the right database —
   * no explicit wiring in the auth flows required.
   */
  private async ensureDb(): Promise<IDBPDatabase<POSDatabase>> {
    const scope = getActiveScopeId();

    if (this.db && this.currentScope === scope) return this.db;

    // Scope changed (user switched) — wait out any in-flight open, then close.
    if (this.openPromise) {
      try { await this.openPromise; } catch { /* ignore */ }
    }
    if (this.db && this.currentScope !== scope) {
      try { this.db.close(); } catch { /* ignore */ }
      this.db = null;
    }
    if (this.db) return this.db;

    this.currentScope = scope;
    const dbName = `${LEGACY_DB_NAME}::${scope}`;
    this.openPromise = openDB<POSDatabase>(dbName, this.version, {
      upgrade(db) {
        upgradePosDb(db);
      },
    });

    try {
      const db = await this.openPromise;
      // A concurrent call may have switched scope again while we were opening.
      if (this.currentScope !== scope) {
        try { db.close(); } catch { /* ignore */ }
        return this.ensureDb();
      }
      this.db = db;
      debugLog('Offline database initialized for scope:', scope);
      return db;
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
      throw error;
    } finally {
      this.openPromise = null;
    }
  }

  /**
   * Rescue offline sales stranded in the pre-isolation SHARED database.
   *
   * Before per-identity scoping, all queued sales lived in `pos-offline-db`.
   * That database is intentionally never reopened for business data, so any
   * sync-queue items still sitting there at upgrade time would never replay.
   * This copies them into the CURRENT identity's queue, parked as 'failed'
   * (never auto-replayed under an arbitrary token — the signed-in user must
   * explicitly retry or discard each one in the review panel), then removes
   * them from the legacy queue. Once the legacy queue holds nothing
   * recoverable, the whole legacy database is deleted.
   *
   * Returns the number of items imported. Safe to call repeatedly: it
   * no-ops when signed out, dedupes by item id and clientRef, and exits
   * early once the legacy database is gone.
   */
  async recoverLegacyQueue(): Promise<number> {
    const scope = getActiveScopeId();
    // Never import while signed out — the items must be claimed by a real
    // identity so retries run under a token that belongs to someone.
    if (scope === 'anon') return 0;

    // Don't create the legacy db just by probing for it, where the browser
    // lets us check first.
    if (!(await legacyDbExists())) return 0;

    let legacy: IDBPDatabase | null = null;
    try {
      legacy = await openDB(LEGACY_DB_NAME);

      // Credential safety gate: ALL legacy offline-login credentials must be
      // merged into the auth vault before this database may be deleted —
      // otherwise accounts that only registered pre-upgrade lose offline
      // login forever. If the merge cannot be confirmed, recovery of queue
      // items still proceeds but deletion is skipped for a later attempt.
      let credentialsSafe = false;
      try {
        const vault = await this.ensureAuthDb();
        await mergeLegacyCredentials(legacy, vault);
        credentialsSafe = true;
      } catch (err: any) {
        console.warn('Legacy credential merge failed; keeping legacy database:', err?.message || err);
      }

      if (!legacy.objectStoreNames.contains('sync_queue')) {
        // No queue store: either an empty shell (possibly one we just
        // created by opening) or a pre-upgrade schema without a queue.
        // Nothing recoverable, so it can go — but only once credentials are
        // confirmed safe (a storeless shell has none to lose).
        const empty = legacy.objectStoreNames.length === 0;
        legacy.close();
        legacy = null;
        if (empty || credentialsSafe) await deleteDB(LEGACY_DB_NAME).catch(() => {});
        return 0;
      }

      const all: any[] = await legacy.getAll('sync_queue');
      const recoverable = (all || []).filter((i) =>
        ['pending', 'syncing', 'failed'].includes(i?.status)
      );

      let imported = 0;
      if (recoverable.length > 0) {
        const db = await this.ensureDb();
        const tx = db.transaction('sync_queue', 'readwrite');
        const existing = await tx.store.getAll();
        const seenIds = new Set(existing.map((e: any) => e.id));
        const seenRefs = new Set(
          existing.map((e: any) => e?.data?.clientRef).filter(Boolean)
        );
        for (const item of recoverable) {
          const ref = item?.data?.clientRef;
          if (seenIds.has(item.id) || (ref && seenRefs.has(ref))) continue;
          await tx.store.put({
            ...item,
            // Parked for manual review: the review panel is the only path
            // back to the server for these, under the claimer's own token.
            status: 'failed' as const,
            claimedBy: undefined,
            claimedAt: undefined,
            owner: scope,
            recoveredFromLegacy: true,
          });
          seenIds.add(item.id);
          if (ref) seenRefs.add(ref);
          imported++;
        }
        await tx.done;

        // Only after the copy committed, drop the items from the legacy
        // queue. If we crash between the two steps, the dedupe above makes
        // a re-run harmless.
        const ltx = legacy.transaction('sync_queue', 'readwrite');
        for (const item of recoverable) {
          await ltx.store.delete(item.id);
        }
        await ltx.done;
      }

      // If nothing recoverable remains AND the credential merge committed,
      // the legacy database has served its purpose — delete it entirely.
      const remaining: any[] = await legacy.getAll('sync_queue');
      const stillRecoverable = (remaining || []).some((i) =>
        ['pending', 'syncing', 'failed'].includes(i?.status)
      );
      legacy.close();
      legacy = null;
      if (!stillRecoverable && credentialsSafe) {
        await deleteDB(LEGACY_DB_NAME).catch(() => {});
        debugLog('Legacy offline database cleaned up');
      }

      if (imported > 0) {
        debugLog(`Recovered ${imported} stranded sync item(s) from the legacy offline database`);
      }
      return imported;
    } catch (err: any) {
      console.warn('Legacy queue recovery failed:', err?.message || err);
      return 0;
    } finally {
      try { legacy?.close(); } catch { /* ignore */ }
    }
  }

  async saveCredential(credential: OfflineCredential): Promise<void> {
    const db = await this.ensureAuthDb();
    await db.put('auth', credential);
    debugLog('Saved offline credential');
  }

  async getCredential(role: 'admin' | 'attendant', identifier: string): Promise<OfflineCredential | null> {
    const db = await this.ensureAuthDb();
    const id = `${role}:${identifier.trim().toLowerCase()}`;
    const record = await db.get('auth', id);
    return (record as OfflineCredential) || null;
  }

  async getAllCredentials(): Promise<OfflineCredential[]> {
    const db = await this.ensureAuthDb();
    return (await db.getAll('auth')) as OfflineCredential[];
  }

  // Settings operations
  async saveSetting(key: string, value: any): Promise<void> {
    const db = await this.ensureDb();
    await db.put('settings', { key, value, lastUpdated: Date.now() });
  }

  async getSetting(key: string): Promise<any> {
    const db = await this.ensureDb();
    const setting = await db.get('settings', key);
    return setting?.value;
  }

  // Temp->real id map. When an offline-created customer or custom item finally
  // syncs, the server assigns it a real _id. We persist that mapping so a queued
  // sale that still references the temp id can be remapped before it's replayed —
  // even across separate sync passes / app restarts. Scoped per identity like
  // everything else in the settings store.
  async getIdMap(): Promise<Record<string, string>> {
    try {
      const map = await this.getSetting('idMap');
      return (map && typeof map === 'object') ? map : {};
    } catch {
      return {};
    }
  }

  async saveIdMapping(tempId: string, realId: string): Promise<void> {
    if (!tempId || !realId) return;
    const map = await this.getIdMap();
    map[tempId] = realId;
    await this.saveSetting('idMap', map);
  }

  // Drop a temp placeholder record once its real counterpart exists, so it stops
  // showing as a duplicate in pickers.
  async removeCustomer(id: string): Promise<void> {
    try {
      const db = await this.ensureDb();
      await db.delete('customers', id);
    } catch { /* ignore */ }
  }

  async removeProduct(id: string): Promise<void> {
    try {
      const db = await this.ensureDb();
      await db.delete('products', id);
    } catch { /* ignore */ }
  }

  // Records the moment fresh data was last pulled from the server, so the UI can
  // warn the cashier when cached data is getting stale.
  async touchLastSync(): Promise<void> {
    try {
      const db = await this.ensureDb();
      await db.put('settings', { key: 'lastDataSync', value: Date.now(), lastUpdated: Date.now() });
    } catch (err) {
      console.warn('Failed to record last sync time:', err);
    }
  }

  async getLastSync(): Promise<number | null> {
    try {
      const db = await this.ensureDb();
      const setting = await db.get('settings', 'lastDataSync');
      return (setting?.value as number) ?? null;
    } catch {
      return null;
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    const db = await this.ensureDb();

    const stores = ['products', 'customers', 'transactions', 'settings', 'sync_queue'];
    for (const storeName of stores) {
      await db.clear(storeName as any);
    }

    debugLog('All offline data cleared for scope:', this.currentScope);
  }

  async getStorageInfo(): Promise<any> {
    const db = await this.ensureDb();

    const productsCount = (await db.getAll('products')).length;
    const customersCount = (await db.getAll('customers')).length;
    const transactionsCount = (await db.getAll('transactions')).length;
    const pendingSyncCount = (await this.getSyncQueue()).length;

    return {
      products: productsCount,
      customers: customersCount,
      transactions: transactionsCount,
      pendingSync: pendingSyncCount,
      lastUpdated: new Date().toISOString()
    };
  }

  private currentScope: string | null = null;

  private openPromise: Promise<IDBPDatabase<POSDatabase>> | null = null;

  private authDb: IDBPDatabase<AuthVaultDatabase> | null = null;

  private authOpenPromise: Promise<IDBPDatabase<AuthVaultDatabase>> | null = null;

  // Offline auth credential vault operations.
  //
  // Deliberately GLOBAL (not per-identity): offline login has to verify a
  // password before any identity is active. Records are keyed per account
  // (`role:identifier`) and contain only that account's salted verifier +
  // profile — no other user's business data.
  private async ensureAuthDb(): Promise<IDBPDatabase<AuthVaultDatabase>> {
    if (this.authDb) return this.authDb;
    if (this.authOpenPromise) return this.authOpenPromise;

    this.authOpenPromise = (async () => {
      const db = await openDB<AuthVaultDatabase>(AUTH_DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('auth')) {
            db.createObjectStore('auth', { keyPath: 'id' });
          }
        },
      });

      // Migration: earlier versions kept credentials inside the shared legacy
      // database. MERGE any records the vault doesn't already have (a newer
      // vault record always wins), so previously-registered accounts can still
      // log in offline after this upgrade — even if some accounts have already
      // re-registered in the new vault.
      try {
        if (await legacyDbExists()) {
          const legacy = await openDB(LEGACY_DB_NAME);
          try {
            await mergeLegacyCredentials(legacy, db);
          } finally {
            legacy.close();
          }
        }
      } catch { /* legacy db missing or unreadable — nothing to migrate */ }

      this.authDb = db;
      return db;
    })();

    try {
      return await this.authOpenPromise;
    } finally {
      this.authOpenPromise = null;
    }
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize on module load
offlineStorage.init().catch(console.error);

export default offlineStorage;

function upgradePosDb(db: IDBPDatabase<POSDatabase>) {
  if (!db.objectStoreNames.contains('products')) {
    const productsStore = db.createObjectStore('products', { keyPath: '_id' });
    productsStore.createIndex('by-name', 'name');
    productsStore.createIndex('by-barcode', 'barcode');
    productsStore.createIndex('by-category', 'category');
  }
  if (!db.objectStoreNames.contains('customers')) {
    const customersStore = db.createObjectStore('customers', { keyPath: '_id' });
    customersStore.createIndex('by-phone', 'phone');
    customersStore.createIndex('by-email', 'email');
  }
  if (!db.objectStoreNames.contains('transactions')) {
    const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
    transactionsStore.createIndex('by-date', 'timestamp');
    transactionsStore.createIndex('by-status', 'status');
    transactionsStore.createIndex('by-sync-status', 'syncStatus');
  }
  if (!db.objectStoreNames.contains('settings')) {
    db.createObjectStore('settings', { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains('sync_queue')) {
    const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
    syncStore.createIndex('by-type', 'type');
    syncStore.createIndex('by-status', 'status');
  }
}

const AUTH_DB_NAME = 'pos-offline-auth';

/**
 * Check whether the legacy shared database still exists WITHOUT creating it
 * (opening a non-existent IndexedDB database creates it as a side effect).
 * Returns true when enumeration is unsupported, so callers fall back to
 * open-and-inspect.
 */
async function legacyDbExists(): Promise<boolean> {
  try {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      return dbs.some((d) => d.name === LEGACY_DB_NAME);
    }
  } catch { /* enumeration failed — assume it might exist */ }
  return true;
}

/**
 * Copy offline-login credentials from the legacy shared database into the
 * auth vault, WITHOUT overwriting vault records that are newer (an account
 * that re-registered post-upgrade keeps its fresh verifier). Must complete
 * before the legacy database may be deleted, or accounts that only ever
 * registered pre-upgrade would silently lose offline login.
 */
async function mergeLegacyCredentials(
  legacy: IDBPDatabase,
  vault: IDBPDatabase<AuthVaultDatabase>
): Promise<number> {
  if (!legacy.objectStoreNames.contains('auth')) return 0;
  const records: OfflineCredential[] = (await legacy.getAll('auth')) || [];
  let merged = 0;
  for (const record of records) {
    if (!record?.id) continue;
    const existing = await vault.get('auth', record.id);
    if (existing && (existing.updatedAt ?? 0) >= (record.updatedAt ?? 0)) continue;
    await vault.put('auth', record);
    merged++;
  }
  if (merged > 0) {
    debugLog(`Migrated ${merged} offline credential(s) to the auth vault`);
  }
  return merged;
}

/**
 * Resolve which identity's offline data should be visible right now.
 * Precedence deliberately mirrors apiCall's Authorization header logic
 * (authToken first, then attendantToken) so queued items in the active scope
 * always replay under the token that belongs to their creator.
 */
export function getActiveScopeId(): string {
  try {
    if (localStorage.getItem('authToken')) {
      const admin = JSON.parse(localStorage.getItem('adminData') || 'null');
      const id = admin?._id || admin?.id;
      if (id) return `admin:${id}`;
      // Token present but profile not stored yet — derive the id from the JWT
      // so we still get a stable per-user scope instead of a shared one.
      try {
        const payload = JSON.parse(atob((localStorage.getItem('authToken') || '').split('.')[1]));
        const jwtId = payload?.id || payload?._id;
        if (jwtId) return `admin:${jwtId}`;
      } catch { /* fall through */ }
      return 'admin:unknown';
    }
    if (localStorage.getItem('attendantToken')) {
      const attendant = JSON.parse(localStorage.getItem('attendantData') || 'null');
      const id = attendant?.attendantId || attendant?._id || attendant?.id;
      if (id) return `attendant:${id}`;
      return 'attendant:unknown';
    }
  } catch { /* corrupted localStorage — treat as signed out */ }
  return 'anon';
}
