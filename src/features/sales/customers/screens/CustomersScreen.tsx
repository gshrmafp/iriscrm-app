import React, { useState, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { NotificationBell } from '@/components/common/NotificationBell';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Loader } from '@/components/feedback/Loader';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { customersApi, Customer } from '@/services/api/customers.api';
import { isWithinDays } from '@/utils/date';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const PAGE_SIZE = 20;
const PRIMARY = '#3B4ECC';

const AVATAR_COLORS = [
  '#059669', '#DC2626', '#7C3AED', '#B45309',
  '#3B4ECC', '#0891B2', '#9333EA', '#92400E',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

type HealthStatus = 'Healthy' | 'At risk' | 'New';
const HEALTH_STYLE: Record<HealthStatus, { bg: string; color: string }> = {
  Healthy:   { bg: '#D1FAE5', color: '#065F46' },
  'At risk': { bg: '#FEE2E2', color: '#991B1B' },
  New:       { bg: '#EEF2FF', color: '#4338CA' },
};

function formatRevenue(revenue?: string | null): string | null {
  if (!revenue) return null;
  const val = Number(revenue);
  if (!val) return null;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${val}`;
}

// A real, timestamp-derived signal — not a stored/subjective "health score".
// New: customer created recently. Healthy: a linked lead moved in the last
// 30 days. At risk: neither of the above, or explicitly deactivated.
function getHealth(customer: Customer): HealthStatus {
  if (!customer.active) return 'At risk';
  if (isWithinDays(customer.createdAt, 14)) return 'New';
  const lastActivity = customer.leads?.[0]?.updatedAt;
  if (lastActivity && isWithinDays(lastActivity, 30)) return 'Healthy';
  return 'At risk';
}

function CustomerCard({ item, onPress }: { item: Customer; onPress: () => void }) {
  const theme = useTheme();
  const displayName = item.name ?? item.contacts?.[0]?.name ?? 'Unknown';
  const ini = displayName.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase() || '?';
  const avatarBg = avatarColor(displayName);
  const primaryContact = item.contacts?.[0];
  const health = getHealth(item);
  const hStyle = HEALTH_STYLE[health];
  const revenue = formatRevenue(item.revenue);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <AppText style={styles.avatarText}>{ini}</AppText>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <AppText style={styles.companyName} color={theme.colors.text} numberOfLines={1}>{displayName}</AppText>
          <View style={[styles.healthBadge, { backgroundColor: hStyle.bg }]}>
            <AppText style={styles.healthText} color={hStyle.color}>{health}</AppText>
          </View>
        </View>
        {primaryContact && (
          <AppText style={styles.contactLine} color={theme.colors.textSecondary} numberOfLines={1}>
            {primaryContact.name}{primaryContact.email ? ` · ${primaryContact.email}` : ''}
          </AppText>
        )}
        {revenue ? (
          <View style={styles.revenueRow}>
            <AppText style={styles.revenueLabel} color={theme.colors.textMuted}>Annual revenue</AppText>
            <AppText style={styles.revenueValue} color={theme.colors.text}>{revenue}</AppText>
          </View>
        ) : (
          <AppText style={styles.revenueLabel} color={theme.colors.textMuted}>{item.type ?? 'Customer'}</AppText>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CustomersScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 400);
  }, []);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['customers', debouncedSearch],
      queryFn: ({ pageParam }) =>
        customersApi.list({ page: pageParam as number, pageSize: PAGE_SIZE, search: debouncedSearch || undefined })
          .then(r => r.data),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const fetched = lastPage.page * lastPage.pageSize;
        return fetched < lastPage.total ? lastPage.page + 1 : undefined;
      },
    });

  const customers = data?.pages.flatMap(p => p.items) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;
  const healthyCount = customers.filter(c => getHealth(c) === 'Healthy').length;

  const searchInputStyle: TextStyle = {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
    color: theme.colors.text,
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <FlatList
        data={customers}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
              <View style={styles.headerTop}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.brandLabel}>IRIS CRM</AppText>
                  <AppText style={styles.pageTitle} color={theme.colors.text}>Customers</AppText>
                  <AppText style={styles.pageSubtitle} color={theme.colors.textMuted}>
                    {totalCount > 0 ? `${totalCount} active relationships` : 'Your customers will appear here'}
                  </AppText>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CustomerCreate')}
                    style={[styles.addBtn, { backgroundColor: PRIMARY }]}
                  >
                    <AppText style={styles.addBtnText}>+</AppText>
                  </TouchableOpacity>
                  <NotificationBell onPress={() => navigation.navigate('Notifications')} />
                </View>
              </View>
              <View style={[styles.searchWrap, { backgroundColor: theme.colors.surfaceAlt, borderRadius: 12 }]}>
                <AppText style={styles.searchIcon} color={theme.colors.textMuted}>⌕</AppText>
                <TextInput
                  value={search}
                  onChangeText={handleSearch}
                  placeholder="Search customers"
                  placeholderTextColor={theme.colors.textMuted}
                  style={searchInputStyle}
                  clearButtonMode="while-editing"
                />
              </View>
            </View>
            {customers.length > 0 && (
              <View style={[styles.healthRow, { borderBottomColor: theme.colors.border }]}>
                <AppText style={styles.healthLabel} color={theme.colors.textSecondary}>Relationship health</AppText>
                <AppText style={styles.healthCount}>{healthyCount} healthy</AppText>
              </View>
            )}
            {isLoading && <Loader />}
          </View>
        }
        contentContainerStyle={styles.list}
        ListFooterComponent={isFetchingNextPage
          ? () => <View style={styles.loader}><ActivityIndicator color={PRIMARY} /></View>
          : undefined}
        ListEmptyComponent={
          !isLoading ? (
            isError ? (
              <EmptyState title="Could not load clients" message="Pull to refresh" action={{ label: 'Retry', onPress: refetch }} />
            ) : (
              <EmptyState
                title="No customers yet"
                message={debouncedSearch ? 'Try different search terms' : 'Customers converted from qualified leads appear here'}
              />
            )
          ) : undefined
        }
        renderItem={({ item }) => (
          <CustomerCard item={item} onPress={() => navigation.navigate('CustomerDetail', { id: item.id })} />
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
  brandLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: PRIMARY, letterSpacing: 1.2, marginBottom: 2 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter-Bold', lineHeight: 34 },
  pageSubtitle: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, color: '#FFF', fontFamily: 'Inter-Regular', lineHeight: 28, marginTop: -2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 44 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  healthLabel: { fontSize: 13, fontFamily: 'Inter-Regular' },
  healthCount: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#059669' },
  list: { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 10, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFF' },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  companyName: { flex: 1, fontSize: 15, fontFamily: 'Inter-SemiBold' },
  healthBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  healthText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  contactLine: { fontSize: 12, fontFamily: 'Inter-Regular' },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 12, fontFamily: 'Inter-Regular' },
  revenueValue: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  loader: { paddingVertical: 16, alignItems: 'center' },
});
