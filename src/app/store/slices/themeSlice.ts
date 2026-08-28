import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeMode } from '@/design-system/theme';
import { setPreference } from '@/services/storage/preferences';

interface ThemeState {
  mode: ThemeMode;
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: 'system' } as ThemeState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      setPreference('iris-theme-preference', action.payload);
    },
    initThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
  },
});

export const { setThemeMode, initThemeMode } = themeSlice.actions;
export default themeSlice.reducer;
