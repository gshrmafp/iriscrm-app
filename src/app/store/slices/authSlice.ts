import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getTokens } from '@/services/storage/secureStorage';
import { getPreference } from '@/services/storage/preferences';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  regionId?: string;
}

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'region-inactive';
export type LogoutReason = 'user' | 'inactive' | 'session-expired';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  logoutReason: LogoutReason | null;
}

const USER_CACHE_KEY = 'iris-cached-user';

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const tokens = await getTokens();
  if (!tokens) return { user: null };
  const cachedUser = await getPreference<AuthUser>(USER_CACHE_KEY);
  return { user: cachedUser };
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    status: 'checking',
    user: null,
    logoutReason: null,
  } as AuthState,
  reducers: {
    setSession(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.status = 'authenticated';
      state.logoutReason = null;
    },
    logout(state, action: PayloadAction<LogoutReason>) {
      state.user = null;
      state.status = 'unauthenticated';
      state.logoutReason = action.payload;
    },
    markRegionInactive(state) {
      state.status = 'region-inactive';
    },
    clearLogoutReason(state) {
      state.logoutReason = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        if (action.payload.user) {
          state.user = action.payload.user;
          state.status = 'authenticated';
        } else {
          state.status = 'unauthenticated';
        }
      })
      .addCase(bootstrapAuth.rejected, state => {
        state.status = 'unauthenticated';
      });
  },
});

export const { setSession, logout, markRegionInactive, clearLogoutReason } = authSlice.actions;
export default authSlice.reducer;
