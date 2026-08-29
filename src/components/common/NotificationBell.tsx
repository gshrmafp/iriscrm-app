import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { AppText } from './AppText';
import { notificationsApi } from '@/services/api/notifications.api';

interface NotificationBellProps {
  onPress: () => void;
  size?: number;
}

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
      <Bell size={18} color={theme.colors.textSecondary} strokeWidth={2} />
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
