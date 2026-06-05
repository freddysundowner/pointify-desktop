import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CloudOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

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

export function NetworkStatusBar() {
  const isOnline = useLiveNetworkStatus();
  const { pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

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
            : `Offline mode${pendingCount > 0 ? ` · ${pendingCount} item${pendingCount !== 1 ? 's' : ''} queued` : ' · changes will sync when connected'}`}
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
