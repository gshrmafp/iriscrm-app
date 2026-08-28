import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useAppDispatch } from '@/app/store/hooks';
import { logout } from '@/app/store/slices/authSlice';

export function RegionInactiveScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.icon, { backgroundColor: theme.colors.surfaceAlt }]}>
          <View style={styles.dot} />
        </View>
        <EmptyState
          title="This region is currently inactive"
          message="Your account's region has been paused by an administrator. Please contact your admin, or try signing in again later."
          action={{ label: 'Sign out', onPress: () => dispatch(logout('inactive')) }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  icon: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', marginTop: 48, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
});
