import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CloudOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { offlineStorage } from '@/lib/offline-storage';

function useLiveNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return isOnline;
}

// Human-friendly "x ago" string for the last successful data sync.
function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function NetworkStatusBar() {
  const isOnline = useLiveNetworkStatus();
  const { pendingCount, isSyncing, syncNow } = useOfflineSync();
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Refresh the "last synced" age while offline so the staleness note stays current.
  useEffect(() => {
    if (isOnline) return;
    let active = true;
    const load = () => {
      offlineStorage.getLastSync().then((ts) => {
        if (active) setLastSync(ts);
      });
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  if (isOnline && pendingCount === 0) return null;

  const staleness = !isOnline && lastSync ? formatAge(Date.now() - lastSync) : null;

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 text-sm font-medium transition-all ${
        isOnline
          ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
          : 'bg-red-50 text-red-800 border-b border-red-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 shrink-0" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" />
        )}
        <span>
          {isOnline
            ? `Back online · ${pendingCount} item${pendingCount !== 1 ? 's' : ''} waiting to sync`
            : `Offline mode${pendingCount > 0 ? ` · ${pendingCount} item${pendingCount !== 1 ? 's' : ''} queued` : ' · changes will sync when connected'}${staleness ? ` · data from ${staleness}` : ''}`}
        </span>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-200 hover:bg-amber-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync Now'}
        </button>
      )}

      {!isOnline && (
        <CloudOff className="h-4 w-4 text-red-500 shrink-0" />
      )}
    </div>
  );
}
