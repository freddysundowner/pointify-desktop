import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';

export const AttendantSessionChecker = () => {
  const { isAuthenticated, isLoading } = useAttendantAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    
    // Only handle attendant-specific routes, don't interfere with any other routes
    if (!isLoading && location.startsWith('/attendant/')) {
      // Check localStorage for attendant data as fallback
      const attendantData = localStorage.getItem('attendantData');
      const hasAttendantSession = isAuthenticated || attendantData;
      
      
      // If we're on attendant routes and not authenticated, redirect to login
      if (location !== '/attendant/login' && !hasAttendantSession) {
        setLocation('/attendant/login');
      }
      
      // If we're authenticated attendant and on attendant login page, redirect appropriately
      if (hasAttendantSession && location === '/attendant/login') {
        const attendantData = localStorage.getItem('attendantData');
        if (attendantData) {
          try {
            const attendant = JSON.parse(attendantData);
            const hasCanSell = attendant.permissions?.some((p: any) => 
              p.key === 'pos' && p.value?.includes('can_sell')
            );
            
            if (hasCanSell) {
              setLocation('/attendant/pos');
            } else {
              setLocation('/attendant/dashboard');
            }
          } catch {
            setLocation('/attendant/dashboard');
          }
        } else {
          setLocation('/attendant/dashboard');
        }
      }
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  return null;
};