import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';

interface AttendantRouteProps {
  children: React.ReactNode;
}

export const AttendantRoute = ({ children }: AttendantRouteProps) => {
  const { isAuthenticated, isLoading } = useAttendantAuth();
  const [, setLocation] = useLocation();


  useEffect(() => {
    // Check localStorage as fallback for authentication
    const attendantData = localStorage.getItem('attendantData');
    const hasAttendantSession = isAuthenticated || attendantData;
    
    
    if (!isLoading && !hasAttendantSession) {
      setLocation('/attendant/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check localStorage as fallback
  const attendantData = localStorage.getItem('attendantData');
  const hasAttendantSession = isAuthenticated || attendantData;

  if (!hasAttendantSession) {
    return null;
  }

  return <>{children}</>;
};