import React from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, FileText, UserCheck, RefreshCw, MessageSquare, AtSign, CheckCircle, Flag, Clock, AlertTriangle, Paperclip, Calendar } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Loader } from '@/components/feedback/Loader';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { notificationsApi, AppNotification, NotificationType, notificationTarget } from '@/services/api/notifications.api';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const PAGE_SIZE = 30;

const TYPE_ICON: Record<NotificationType, React.ComponentType<any>> = {
  QUERY_CREATED: FileText,
  QUERY_ASSIGNED: UserCheck,
  QUERY_STATUS_CHANGED: RefreshCw,
  QUERY_COMMENT_ADDED: MessageSquare,
  QUERY_MENTIONED: AtSign,
  QUERY_CLOSED: CheckCircle,
  QUERY_PRIORITY_CHANGED: Flag,
  FOLLOW_UP_DUE: Clock,
  FOLLOW_UP_OVERDUE: AlertTriangle,
  QUERY_ATTACHMENT_UPLOADED: Paperclip,
  QUERY_DUE_DATE_UPDATED: Calendar,
  ENTITY_MENTIONED: AtSign,
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  const unread = !item.readAt;
  const IconComponent = TYPE_ICON[item.type] ?? Bell;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.row, { backgroundColor: unread ? theme.colors.primaryLight : theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: unread ? theme.colors.primary : theme.colors.surfaceAlt }]}>
        <IconComponent size={15} color={unread ? '#FFF' : theme.colors.textSecondary} strokeWidth={2} />
      </View>
      <View style={styles.content}>
        <AppText style={unread ? { ...styles.title, ...styles.titleUnread } : styles.title} color={theme.colors.text} numberOfLines={2}>
          {item.title}
        </AppText>
        {item.body ? (
          <AppText style={styles.body} color={theme.colors.textSecondary} numberOfLines={2}>{item.body}</AppText>
        ) : null}
        <AppText style={styles.time} color={theme.colors.textMuted}>{timeAgo(item.createdAt)}</AppText>
      </View>
      {unread && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['notifications'],
      queryFn: ({ pageParam }) =>
        notificationsApi.list({ page: pageParam as number, pageSize: PAGE_SIZE }).then(r => r.data),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const fetched = lastPage.meta.page * lastPage.meta.pageSize;
        return fetched < lastPage.meta.total ? lastPage.meta.page + 1 : undefined;
      },
    });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const items = data?.pages.flatMap(p => p.data) ?? [];

  const handlePress = (item: AppNotification) => {
    if (!item.readAt) markReadMutation.mutate(item.id);
    const target = notificationTarget(item);
    if (target) navigation.navigate(target.screen, { id: target.id });
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}>
                <ChevronLeft size={20} color={theme.colors.text} strokeWidth={2} />
              </TouchableOpacity>
              <AppText style={styles.pageTitle} color={theme.colors.text}>Notifications</AppText>
              <TouchableOpacity onPress={() => markAllReadMutation.mutate()} style={styles.markAllBtn}>
                <AppText style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: theme.colors.primary }}>Mark all read</AppText>
              </TouchableOpacity>
            </View>
            {isLoading && <Loader />}
            {isError && <EmptyState title="Could not load notifications" message="Pull to refresh" action={{ label: 'Retry', onPress: refetch }} />}
          </View>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading && !isError ? (
            <EmptyState title="No notifications" message="You're all caught up" />
          ) : undefined
        }
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => handlePress(item)} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter-SemiBold' },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  list: { padding: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 19 },
  titleUnread: { fontFamily: 'Inter-SemiBold' },
  body: { fontSize: 12, fontFamily: 'Inter-Regular', lineHeight: 17 },
  time: { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
});
