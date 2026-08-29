import React, { useState } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity, ActivityIndicator, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, Mail, CalendarCheck, Building2, Check } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { NotificationBell } from '@/components/common/NotificationBell';
import { SkeletonActivityItem, EmptyState } from '@/components/feedback';
import { leadsApi, FollowUp, FollowUpPriority } from '@/services/api/leads.api';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { isToday, isOverdue, formatFollowUpTime } from '@/utils/date';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const PAGE_SIZE = 20;

const CHANNEL_ICON: Record<string, React.ComponentType<any>> = {
  call: Phone,
  email: Mail,
  meeting: CalendarCheck,
  visit: Building2,
};

const PRIORITY_STYLE: Record<FollowUpPriority, { bg: string; color: string; label: string }> = {
  URGENT: { bg: '#FEE2E2', color: '#DC2626', label: 'Urgent' },
  HIGH:   { bg: '#FEE2E2', color: '#DC2626', label: 'High' },
  MEDIUM: { bg: '#FEF3C7', color: '#D97706', label: 'Medium' },
  LOW:    { bg: '#F1F5F9', color: '#6B7280', label: 'Low' },
};

const FILTER_TABS = [
  { label: 'All',       value: 'all' },
  { label: 'Today',     value: 'today' },
  { label: 'Upcoming',  value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
];

function ActivityItem({ item, onPress, onToggle, toggling }: {
  item: FollowUp;
  onPress: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const theme = useTheme();
  const completed = Boolean(item.completedAt);
  const pStyle = PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE.MEDIUM;
  const ChannelIcon = CHANNEL_ICON[item.channel] ?? CalendarCheck;
  const timeLabel = item.nextActionAt ? formatFollowUpTime(item.nextActionAt) : '';
  const companyName = item.lead ? (item.lead.companyName ?? item.lead.contactName) : '';

  const titleStyle: TextStyle = {
    ...styles.itemTitle,
    color: theme.colors.text,
    textDecorationLine: completed ? 'line-through' : 'none',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: completed ? 0.6 : 1 }]}
    >
      <TouchableOpacity
        onPress={onToggle}
        disabled={completed || toggling}
        style={[styles.checkbox, { borderColor: completed ? '#10B981' : theme.colors.border, backgroundColor: completed ? '#10B981' : 'transparent' }]}
        activeOpacity={0.75}
      >
        {completed && <Check size={12} color="#FFF" strokeWidth={3} />}
      </TouchableOpacity>

      <View style={[styles.channelIcon, { backgroundColor: theme.colors.primaryLight }]}>
        <ChannelIcon size={14} color={theme.colors.primary} strokeWidth={2} />
      </View>

      <View style={styles.itemContent}>
        <AppText style={titleStyle} numberOfLines={1}>{item.note}</AppText>
        {companyName ? (
          <AppText style={styles.itemCompany} color={theme.colors.textMuted} numberOfLines={1}>{companyName}</AppText>
        ) : null}
        {timeLabel ? (
          <AppText style={styles.itemTime} color={theme.colors.textMuted}>{timeLabel}</AppText>
        ) : null}
      </View>

      <View style={[styles.priorityBadge, { backgroundColor: pStyle.bg }]}>
        <AppText style={styles.priorityText} color={pStyle.color}>{pStyle.label}</AppText>
      </View>
    </TouchableOpacity>
  );
}

export function ActivitiesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('all');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['follow-ups-feed'],
      queryFn: ({ pageParam }) =>
        leadsApi.followUpsFeed({ page: pageParam as number, pageSize: PAGE_SIZE }).then(r => r.data),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const fetched = lastPage.page * lastPage.pageSize;
        return fetched < lastPage.total ? lastPage.page + 1 : undefined;
      },
    });

  const completeMutation = useMutation({
    mutationFn: (followUpId: string) => leadsApi.completeFollowUp(followUpId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-ups-feed'] }),
  });

  const allItems = data?.pages.flatMap(p => p.items) ?? [];

  const filteredItems = allItems.filter(item => {
    const completed = Boolean(item.completedAt);
    if (activeFilter === 'completed') return completed;
    if (activeFilter === 'today') return !completed && isToday(item.nextActionAt ?? item.createdAt);
    if (activeFilter === 'upcoming') return !completed && !isOverdue(item.nextActionAt) && !isToday(item.nextActionAt ?? item.createdAt);
    return true;
  });

  const chipActiveStyle = (active: boolean): TextStyle => ({
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: active ? '#FFF' : theme.colors.textSecondary,
  });

  return (
    <Screen edges={['left', 'right']}>
      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
              <View style={styles.headerTop}>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.brandLabel, { color: theme.colors.primary }]}>IRIS CRM</AppText>
                  <AppText style={styles.pageTitle} color={theme.colors.text}>Activities</AppText>
                  <AppText style={styles.pageSubtitle} color={theme.colors.textMuted}>Your follow-up queue</AppText>
                </View>
                <NotificationBell onPress={() => navigation.navigate('Notifications')} />
              </View>
              <View style={styles.filterRow}>
                {FILTER_TABS.map(f => {
                  const active = activeFilter === f.value;
                  return (
                    <TouchableOpacity
                      key={f.value}
                      onPress={() => setActiveFilter(f.value)}
                      style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                    >
                      <AppText style={chipActiveStyle(active)}>{f.label}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {isError && <EmptyState title="Could not load activities" message="Pull to refresh" action={{ label: 'Retry', onPress: refetch }} />}
          </View>
        }
        contentContainerStyle={styles.list}
        ListFooterComponent={isFetchingNextPage
          ? () => <View style={styles.loader}><ActivityIndicator color={theme.colors.primary} /></View>
          : undefined}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
              {[1, 2, 3, 4].map(i => <SkeletonActivityItem key={i} />)}
            </View>
          ) : !isError ? (
            <EmptyState title="No activities" message="Follow-ups you log on leads appear here" />
          ) : undefined
        }
        renderItem={({ item }) => (
          <ActivityItem
            item={item}
            toggling={completeMutation.isPending && completeMutation.variables === item.id}
            onToggle={() => completeMutation.mutate(item.id)}
            onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  brandLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', letterSpacing: 1.2, marginBottom: 2 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter-Bold', lineHeight: 34 },
  pageSubtitle: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 12, gap: 8 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  channelIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', lineHeight: 18 },
  itemCompany: { fontSize: 12, fontFamily: 'Inter-Regular' },
  itemTime: { fontSize: 11, fontFamily: 'Inter-Regular' },
  priorityBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, alignSelf: 'center' },
  priorityText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  loader: { paddingVertical: 16, alignItems: 'center' },
});
