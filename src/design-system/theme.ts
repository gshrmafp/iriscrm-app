import { palette, typography, radii, spacing, shadows } from './tokens';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: typeof typography;
  radii: typeof radii;
  spacing: typeof spacing;
  shadows: typeof shadows;
}

export function buildTheme(mode: 'light' | 'dark'): Theme {
  return {
    mode,
    colors: palette[mode],
    typography,
    radii,
    spacing,
    shadows,
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
