import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { bootstrapAuth } from '@/app/store/slices/authSlice';
import { useTheme } from '@/design-system';
import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { RegionInactiveScreen } from '@/features/auth/screens/RegionInactiveScreen';
import { AuthNavigator } from './AuthNavigator';
import { AppDrawerNavigator } from './AppDrawerNavigator';

export function RootNavigator() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { status } = useAppSelector(s => s.auth);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  const navTheme = theme.mode === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.background, card: theme.colors.surface, border: theme.colors.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.surface, border: theme.colors.border } };

  if (status === 'checking') {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {status === 'authenticated' ? (
        <AppDrawerNavigator />
      ) : status === 'region-inactive' ? (
        <RegionInactiveScreen />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
