import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/design-system';
import { AppText } from './AppText';
import { notificationsApi } from '@/services/api/notifications.api';

interface NotificationBellProps {
  onPress: () => void;
  size?: number;
}

// The one bell button every tab-root screen renders — real unread count via
// TanStack Query (polled), not a hardcoded badge number. Used in place of
// each screen's previous copy-pasted, dead 🔔 TouchableOpacity.
export function NotificationBell({ onPress, size = 42 }: NotificationBellProps) {
  const theme = useTheme();
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount().then(r => r.data.count),
    refetchInterval: 30_000,
  });
  const count = data ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.bell, { width: size, height: size, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.md }]}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    >
      <AppText style={styles.icon}>🔔</AppText>
      {count > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.error, borderColor: theme.colors.surface }]}>
          <AppText style={styles.badgeText}>{count > 9 ? '9+' : count}</AppText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bell: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 16 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { fontSize: 9, fontFamily: 'Inter-Bold', color: '#FFF' },
});
