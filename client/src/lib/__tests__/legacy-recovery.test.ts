// Integration tests for recovery of offline data stranded in the pre-isolation
// SHARED database (`pos-offline-db`): queued sales must be imported into the
// signed-in user's queue parked for manual review, offline-login credentials
// must be merged into the auth vault (never clobbering newer vault records),
// and the legacy database must only be deleted once both are safe.
import 'fake-indexeddb/auto';
import { openDB, deleteDB } from 'idb';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

import { offlineStorage } from '../offline-storage';

const anyStorage = offlineStorage as any;
const LEGACY = 'pos-offline-db';
const VAULT = 'pos-offline-auth';

// Sign in a fake attendant so getActiveScopeId() resolves a real scope.
beforeAll(() => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  localStorage.setItem('attendantToken', 'tok');
  localStorage.setItem('attendantData', JSON.stringify({ attendantId: 'att1' }));
});

async function dbExists(name: string): Promise<boolean> {
  const dbs = await indexedDB.databases();
  return dbs.some((d) => d.name === name);
}

// Build a realistic pre-upgrade shared database.
async function seedLegacy({
  queue = [] as any[],
  credentials = [] as any[],
} = {}) {
  const legacy = await openDB(LEGACY, 1, {
    upgrade(db) {
      const q = db.createObjectStore('sync_queue', { keyPath: 'id' });
      q.createIndex('by-type', 'type');
      q.createIndex('by-status', 'status');
      db.createObjectStore('auth', { keyPath: 'id' });
    },
  });
  for (const item of queue) await legacy.put('sync_queue', item);
  for (const cred of credentials) await legacy.put('auth', cred);
  legacy.close();
}

function saleItem(id: string, status: string, clientRef?: string) {
  return {
    id,
    type: 'transaction',
    data: { clientRef: clientRef ?? `ref-${id}`, amountPaid: 100 },
    timestamp: Date.now(),
    retries: 0,
    status,
  };
}

async function scopedQueue() {
  await offlineStorage.init();
  return anyStorage.db.getAll('sync_queue');
}

beforeEach(async () => {
  // Fresh world: close singleton handles (deleteDB blocks on open
  // connections), drop every database, and reset the caches.
  try { anyStorage.db?.close(); } catch { /* ignore */ }
  try { anyStorage.authDb?.close(); } catch { /* ignore */ }
  anyStorage.db = null;
  anyStorage.currentScope = null;
  anyStorage.authDb = null;
  for (const { name } of await indexedDB.databases()) {
    if (name) await deleteDB(name);
  }
});

describe('recoverLegacyQueue — queue import', () => {
  it('imports pending/syncing/failed items parked as failed for manual review, skips synced', async () => {
    await seedLegacy({
      queue: [
        saleItem('a', 'pending'),
        saleItem('b', 'syncing'),
        saleItem('c', 'failed'),
        saleItem('d', 'synced'),
      ],
    });

    const imported = await offlineStorage.recoverLegacyQueue();
    expect(imported).toBe(3);

    const items = await scopedQueue();
    expect(items.map((i: any) => i.id).sort()).toEqual(['a', 'b', 'c']);
    for (const item of items) {
      expect(item.status).toBe('failed'); // never auto-replayed
      expect(item.recoveredFromLegacy).toBe(true);
      expect(item.owner).toBe('attendant:att1');
    }

    // Nothing recoverable left -> legacy db cleaned up.
    expect(await dbExists(LEGACY)).toBe(false);
  });

  it('dedupes by clientRef against the current queue and is idempotent on re-run', async () => {
    await offlineStorage.addToSyncQueue('transaction', { clientRef: 'dup-ref' });
    await seedLegacy({
      queue: [saleItem('legacy-dup', 'pending', 'dup-ref'), saleItem('fresh', 'pending')],
    });

    expect(await offlineStorage.recoverLegacyQueue()).toBe(1);
    // Legacy db already deleted; a re-run is a no-op.
    expect(await offlineStorage.recoverLegacyQueue()).toBe(0);

    const items = await scopedQueue();
    const refs = items.map((i: any) => i.data.clientRef).sort();
    expect(refs).toEqual(['dup-ref', 'ref-fresh']);
  });

  it('does nothing while signed out', async () => {
    localStorage.removeItem('attendantToken');
    try {
      await seedLegacy({ queue: [saleItem('x', 'pending')] });
      expect(await offlineStorage.recoverLegacyQueue()).toBe(0);
      expect(await dbExists(LEGACY)).toBe(true); // untouched
    } finally {
      localStorage.setItem('attendantToken', 'tok');
    }
  });
});

describe('recoverLegacyQueue — credential safety', () => {
  it('merges legacy-only credentials into a NON-empty vault before deleting the legacy db', async () => {
    // Vault already holds one post-upgrade credential (newer than legacy's copy).
    const vault = await openDB(VAULT, 1, {
      upgrade(db) {
        db.createObjectStore('auth', { keyPath: 'id' });
      },
    });
    await vault.put('auth', {
      id: 'attendant:mary',
      role: 'attendant',
      identifier: 'mary',
      salt: 'new-salt',
      verifier: 'new-verifier',
      token: 't',
      profile: {},
      updatedAt: 2000,
    });
    vault.close();

    await seedLegacy({
      queue: [saleItem('q1', 'pending')],
      credentials: [
        // Stale copy of mary — must NOT overwrite the newer vault record.
        { id: 'attendant:mary', role: 'attendant', identifier: 'mary', salt: 'old-salt', verifier: 'old-verifier', token: 't', profile: {}, updatedAt: 1000 },
        // john only ever registered pre-upgrade — must survive deletion.
        { id: 'admin:john', role: 'admin', identifier: 'john', salt: 's', verifier: 'v', token: 't', profile: {}, updatedAt: 1000 },
      ],
    });

    expect(await offlineStorage.recoverLegacyQueue()).toBe(1);
    expect(await dbExists(LEGACY)).toBe(false);

    const creds = await offlineStorage.getAllCredentials();
    const byId = Object.fromEntries(creds.map((c) => [c.id, c]));
    expect(byId['admin:john']).toBeTruthy(); // rescued before deletion
    expect(byId['attendant:mary'].salt).toBe('new-salt'); // newer vault record kept
  });

  it('legacy credential newer than the vault copy wins the merge', async () => {
    const vault = await openDB(VAULT, 1, {
      upgrade(db) {
        db.createObjectStore('auth', { keyPath: 'id' });
      },
    });
    await vault.put('auth', {
      id: 'attendant:old', role: 'attendant', identifier: 'old', salt: 'stale', verifier: 'stale', token: 't', profile: {}, updatedAt: 1000,
    });
    vault.close();

    await seedLegacy({
      credentials: [
        { id: 'attendant:old', role: 'attendant', identifier: 'old', salt: 'fresh', verifier: 'fresh', token: 't', profile: {}, updatedAt: 5000 },
      ],
    });

    await offlineStorage.recoverLegacyQueue();
    const cred = await offlineStorage.getCredential('attendant', 'old');
    expect(cred?.salt).toBe('fresh');
  });
});
