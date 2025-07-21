import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AttendantData {
  _id: string;
  username: string;
  uniqueDigits: number;
  shopId: string | { _id: string; name: string };
  adminId: string;
  permissions: Array<{ key: string; value: string[] }>;
  status: string;
}

interface AttendantState {
  attendant: AttendantData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
}

const initialState: AttendantState = {
  attendant: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isRefreshing: false,
};

const attendantSlice = createSlice({
  name: 'attendant',
  initialState,
  reducers: {
    setAttendant: (state, action: PayloadAction<{ attendant: AttendantData; token: string }>) => {
      state.attendant = action.payload.attendant;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    updateAttendant: (state, action: PayloadAction<AttendantData>) => {
      state.attendant = action.payload;
    },
    clearAttendant: (state) => {
      state.attendant = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isRefreshing = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
  },
});

export const { setAttendant, updateAttendant, clearAttendant, setLoading, setRefreshing } = attendantSlice.actions;
export default attendantSlice.reducer;