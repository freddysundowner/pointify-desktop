import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rawApiFetch } from '@/lib/api-config';

export type NetworkStatus = 'online' | 'offline';

interface NetworkStatusResponse {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  timestamp: string;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(navigator.onLine ? 'online' : 'offline');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const { data: networkData, refetch } = useQuery<NetworkStatusResponse>({
    queryKey: ['/api/network/status'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (networkData) {
      setStatus(networkData.status);
      setIsOnline(networkData.isOnline);
      setLastCheck(new Date(networkData.timestamp));
    }
  }, [networkData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('online');
      refetch();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch]);

  const checkNetwork = async () => {
    try {
      const response = await rawApiFetch('/api/network/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        auth: 'none', // connectivity ping — no token needed
      });
      if (response.ok) {
        const data: NetworkStatusResponse = await response.json();
        setStatus(data.status);
        setIsOnline(data.isOnline);
        setLastCheck(new Date(data.timestamp));
        return data;
      }
    } catch {
      setStatus('offline');
      setIsOnline(false);
    }
    return null;
  };

  return {
    status,
    isOnline,
    isOffline: !isOnline,
    lastCheck,
    checkNetwork,
    refetch,
  };
}
