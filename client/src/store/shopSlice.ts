import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Shop {
  id: string;
  name: string;
  type: string;
  location: string;
}

interface ShopState {
  selectedShopId: string | null;
  availableShops: Shop[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ShopState = {
  selectedShopId: null,
  availableShops: [],
  isLoading: false,
  error: null,
};

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    setSelectedShop: (state, action: PayloadAction<string>) => {
      state.selectedShopId = action.payload;
      // Persist to localStorage for session recovery
      localStorage.setItem('selectedShopId', action.payload);
    },
    setAvailableShops: (state, action: PayloadAction<Shop[]>) => {
      state.availableShops = action.payload;
    },
    initializeSelectedShop: (state, action: PayloadAction<string | null>) => {
      // Initialize from localStorage or admin data
      const storedShopId = localStorage.getItem('selectedShopId');
      state.selectedShopId = storedShopId || action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearShopData: (state) => {
      state.selectedShopId = null;
      state.availableShops = [];
      state.error = null;
      localStorage.removeItem('selectedShopId');
    },
  },
});

export const {
  setSelectedShop,
  setAvailableShops,
  initializeSelectedShop,
  setLoading,
  setError,
  clearShopData,
} = shopSlice.actions;

export default shopSlice.reducer;