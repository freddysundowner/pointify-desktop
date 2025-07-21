import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';

interface PrimaryShopData {
  shopId: string;
  adminId: string;
  shopData?: any;
  userType: 'admin' | 'attendant' | null;
  attendantId: string | null
}

export const usePrimaryShop = (): PrimaryShopData => {
  const { admin } = useAuth();
  const { attendant } = useAttendantAuth();
  const [primaryShopData, setPrimaryShopData] = useState<PrimaryShopData>({
    shopId: '',
    adminId: '',
    shopData: null,
    userType: null,
    attendantId: null
  });

  useEffect(() => {
    console.log('usePrimaryShop: Evaluating user type and shop data');
    console.log('Attendant data:', attendant ? 'Present' : 'None');
    console.log('Admin data:', admin ? 'Present' : 'None');
    
    // Check if user is an attendant
    if (attendant) {
      const shopId = typeof attendant.shopId === 'string' 
        ? attendant.shopId 
        : attendant.shopId?._id || '';
      
      console.log('usePrimaryShop: Using attendant data - shopId:', shopId, 'adminId:', attendant.adminId);
      
      setPrimaryShopData({
        shopId,
        adminId: attendant.adminId || '',
        shopData: typeof attendant.shopId === 'object' ? attendant.shopId : null,
        userType: 'attendant',
        attendantId: attendant._id || attendant.id || ''
      });
      return;
    }

    // Check if user is an admin
    if (admin) {
      const getShopId = (primaryShop: any) => {
        if (!primaryShop) return '';
        if (typeof primaryShop === 'string') return primaryShop;
        return primaryShop._id || primaryShop.id || '';
      };

      const shopId = getShopId(admin.primaryShop);
      const adminId = admin._id || admin.id || '';
      
      console.log('usePrimaryShop: Using admin data - shopId:', shopId, 'adminId:', adminId);

      setPrimaryShopData({
        shopId,
        adminId,
        shopData: typeof admin.primaryShop === 'object' ? admin.primaryShop : null,
        userType: 'admin',
        attendantId: admin.attendantId || ''
      });
      return;
    }

    // Fallback: Try to get data from localStorage directly
    try {
      const attendantData = localStorage.getItem('attendantData');
      if (attendantData) {
        const parsedAttendant = JSON.parse(attendantData);
        const shopId = typeof parsedAttendant.shopId === 'string' 
          ? parsedAttendant.shopId 
          : parsedAttendant.shopId?._id || '';
        
        setPrimaryShopData({
          shopId,
          adminId: parsedAttendant.adminId || '',
          attendantId: parsedAttendant._id || parsedAttendant.id || '',
          shopData: typeof parsedAttendant.shopId === 'object' ? parsedAttendant.shopId : null,
          userType: 'attendant'
        });
        return;
      }

      const adminData = localStorage.getItem('adminData');
      if (adminData) {
        const parsedAdmin = JSON.parse(adminData);
        const getShopId = (primaryShop: any) => {
          if (!primaryShop) return '';
          if (typeof primaryShop === 'string') return primaryShop;
          return primaryShop._id || primaryShop.id || '';
        };

        setPrimaryShopData({
          shopId: getShopId(parsedAdmin.primaryShop),
          attendantId: parsedAdmin.attendantId || '',
          adminId: parsedAdmin._id || parsedAdmin.id || '',
          shopData: typeof parsedAdmin.primaryShop === 'object' ? parsedAdmin.primaryShop : null,
          userType: 'admin'
        });
        return;
      }
    } catch (error) {
      console.error('Error parsing localStorage data:', error);
    }

    // Reset if no valid data found
    setPrimaryShopData({
      shopId: '',
      adminId: '',
      shopData: null,
      userType: null,
      attendantId : null
    });
  }, [admin, attendant]);

  return primaryShopData;
};