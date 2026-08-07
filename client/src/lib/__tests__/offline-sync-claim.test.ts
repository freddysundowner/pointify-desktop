// Integration tests for the offline sync queue's duplicate-sale guards:
// atomic in-flight claiming, lease-based quarantine, and clientRef dedup.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

// Fresh module (and fresh session id) per test file run.
import { offlineStorage, SYNC_CLAIM_LEASE_MS, SYNC_SESSION_ID } from '../offline-storage';

const anyStorage = offlineStorage as any;

async function resetQueue() {
  await offlineStorage.init();
  const db = anyStorage.db;
  const tx = db.transaction('sync_queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

async function getItem(id: string) {
  return anyStorage.db.get('sync_queue', id);
}

async function putItem(item: any) {
  await anyStorage.db.put('sync_queue', item);
}

async function seedSale(clientRef = 'ref-1') {
  await offlineStorage.addToSyncQueue('transaction', { clientRef, amountPaid: 100 });
  const queue = await offlineStorage.getSyncQueue();
  return queue[0];
}

describe('claimSyncItem', () => {
  beforeEach(resetQueue);

  it('two concurrent claim/flush attempts on the same item produce exactly one POST', async () => {
    const item = await seedSale();

    let postCount = 0;
    // Simulates a flush loop: claim, then POST only if the claim won.
    const flush = async () => {
      const claimed = await offlineStorage.claimSyncItem(item.id);
      if (claimed) {
        postCount++;
        await offlineStorage.markSyncComplete(item.id);
      }
      return claimed;
    };

    const results = await Promise.all([flush(), flush()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(postCount).toBe(1);
    expect((await getItem(item.id)).status).toBe('synced');
  });

  it('many concurrent claims still yield a single winner', async () => {
    const item = await seedSale('ref-many');
    const results = await Promise.all(
      Array.from({ length: 10 }, () => offlineStorage.claimSyncItem(item.id))
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('does not claim items that are not pending', async () => {
    const item = await seedSale('ref-2');
    await putItem({ ...item, status: 'failed' });
    expect(await offlineStorage.claimSyncItem(item.id)).toBe(false);
    expect(await offlineStorage.claimSyncItem('does-not-exist')).toBe(false);
  });

  it('records owner session and lease timestamp on claim', async () => {
    const item = await seedSale('ref-3');
    await offlineStorage.claimSyncItem(item.id);
    const claimed = await getItem(item.id);
    expect(claimed.status).toBe('syncing');
    expect(claimed.claimedBy).toBe(SYNC_SESSION_ID);
    expect(typeof claimed.claimedAt).toBe('number');
  });
});

describe('quarantineStaleInFlight', () => {
  beforeEach(resetQueue);

  it('leaves a fresh claim held by another live session alone', async () => {
    const item = await seedSale('ref-4');
    await putItem({
      ...item,
      status: 'syncing',
      claimedBy: 'sess_other_tab',
      claimedAt: Date.now(),
    });
    expect(await offlineStorage.quarantineStaleInFlight()).toBe(0);
    expect((await getItem(item.id)).status).toBe('syncing');
  });

  it('parks an expired foreign claim as failed for manual review', async () => {
    const item = await seedSale('ref-5');
    await putItem({
      ...item,
      status: 'syncing',
      claimedBy: 'sess_dead_tab',
      claimedAt: Date.now() - SYNC_CLAIM_LEASE_MS - 1000,
    });
    expect(await offlineStorage.quarantineStaleInFlight()).toBe(1);
    expect((await getItem(item.id)).status).toBe('failed');
  });

  it('parks our own leftover claim (nothing of ours can be live at flush start)', async () => {
    const item = await seedSale('ref-6');
    await putItem({
      ...item,
      status: 'syncing',
      claimedBy: SYNC_SESSION_ID,
      claimedAt: Date.now(),
    });
    expect(await offlineStorage.quarantineStaleInFlight()).toBe(1);
    expect((await getItem(item.id)).status).toBe('failed');
  });

  it('parks legacy claims with no lease metadata', async () => {
    const item = await seedSale('ref-7');
    await putItem({ ...item, status: 'syncing' });
    expect(await offlineStorage.quarantineStaleInFlight()).toBe(1);
    expect((await getItem(item.id)).status).toBe('failed');
  });
});

describe('addToSyncQueue clientRef dedup', () => {
  beforeEach(resetQueue);

  it('blocks re-enqueue of an already-synced clientRef', async () => {
    const item = await seedSale('ref-8');
    await offlineStorage.markSyncComplete(item.id);
    await offlineStorage.addToSyncQueue('transaction', { clientRef: 'ref-8' });
    const all = await anyStorage.db.getAll('sync_queue');
    expect(all).toHaveLength(1);
  });

  it('two concurrent enqueues of the same clientRef yield exactly one queue row', async () => {
    await Promise.all([
      offlineStorage.addToSyncQueue('transaction', { clientRef: 'ref-race', amountPaid: 50 }),
      offlineStorage.addToSyncQueue('transaction', { clientRef: 'ref-race', amountPaid: 50 }),
    ]);
    const all = await anyStorage.db.getAll('sync_queue');
    expect(all).toHaveLength(1);
  });

  it('many concurrent enqueues of the same clientRef still yield one row', async () => {
    await Promise.all(
      Array.from({ length: 10 }, () =>
        offlineStorage.addToSyncQueue('transaction', { clientRef: 'ref-race-many' })
      )
    );
    const all = await anyStorage.db.getAll('sync_queue');
    expect(all).toHaveLength(1);
  });

  it('blocks re-enqueue for every queue status', async () => {
    for (const status of ['pending', 'syncing', 'failed'] as const) {
      await resetQueue();
      const item = await seedSale(`ref-${status}`);
      await putItem({ ...item, status });
      await offlineStorage.addToSyncQueue('transaction', { clientRef: `ref-${status}` });
      expect(await anyStorage.db.getAll('sync_queue')).toHaveLength(1);
    }
  });
});
