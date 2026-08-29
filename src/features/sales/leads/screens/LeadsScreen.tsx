import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { NotificationBell } from '@/components/common/NotificationBell';
import { SkeletonLeadCard, EmptyState } from '@/components/feedback';
import { useDebounceSearch } from '@/hooks/useDebounceSearch';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { leadsApi, Lead } from '@/services/api/leads.api';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  NEW:       { label: 'New',       bg: '#FEF3C7', color: '#D97706' },
  QUALIFIED: { label: 'Qualified', bg: '#D1FAE5', color: '#065F46' },
  LOST:      { label: 'Lost',      bg: '#FEE2E2', color: '#991B1B' },
};

// Once a lead is qualified it converts into an Opportunity, which then moves
// through its own pipeline (NEW..WON/LOST) independent of the lead's own
// (frozen) QUALIFIED status. Showing the opportunity's stage here — instead
// of always "Qualified" — is what surfaces "Quoted" on the lead card.
const OPPORTUNITY_STAGE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  NEW:         { label: 'Qualified',  bg: '#D1FAE5', color: '#065F46' },
  CONTACTED:   { label: 'Contacted',  bg: '#DBEAFE', color: '#1D4ED8' },
  QUOTED:      { label: 'Quoted',     bg: '#E0E7FF', color: '#4338CA' },
  NEGOTIATION: { label: 'Negotiation',bg: '#FCE7F3', color: '#9D174D' },
  WON:         { label: 'Won',        bg: '#DCFCE7', color: '#15803D' },
  LOST:        { label: 'Lost',       bg: '#FEE2E2', color: '#991B1B' },
};

type FilterTab = { label: string; status?: string; opportunityStage?: string };

const FILTER_TABS: FilterTab[] = [
  { label: 'All' },
  { label: 'New', status: 'NEW' },
  { label: 'Qualified', status: 'QUALIFIED' },
  { label: 'Quoted', opportunityStage: 'QUOTED' },
  { label: 'Lost', status: 'LOST' },
];

const AVATAR_COLORS = [
  '#3B4ECC', '#7C3AED', '#059669', '#B45309',
  '#DC2626', '#0891B2', '#9333EA', '#65A30D', '#C2410C',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

function formatDealValue(val?: number): string | null {
  if (!val) return null;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${val}`;
}

function LeadCard({ item, onPress }: { item: Lead; onPress: () => void }) {
  const theme = useTheme();
  const displayName = item.contactName || item.companyName || 'Unknown';
  const company = item.companyName;
  const badge = item.opportunity
    ? OPPORTUNITY_STAGE_BADGE[item.opportunity.stage] ?? { label: item.opportunity.stage, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted }
    : STATUS_BADGE[item.status] ?? { label: item.status, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted };
  const avatarBg = avatarColor(displayName);
  const ini = initials(displayName);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.leadCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.leadAvatar, { backgroundColor: avatarBg }]}>
        <AppText style={styles.leadAvatarText}>{ini}</AppText>
      </View>
      <View style={styles.leadInfo}>
        <View style={styles.leadTopRow}>
          <AppText style={styles.leadName} color={theme.colors.text} numberOfLines={1}>
            {displayName}
          </AppText>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <AppText style={styles.statusBadgeText} color={badge.color}>{badge.label}</AppText>
          </View>
        </View>
        {company ? (
          <AppText style={styles.leadCompany} color={theme.colors.textSecondary} numberOfLines={1}>
            {company}{item.productInterest ? ` · ${item.productInterest}` : ''}
          </AppText>
        ) : null}
        {item.notes ? (
          <AppText style={styles.leadNote} color={theme.colors.textMuted} numberOfLines={1}>
            {item.notes}
          </AppText>
        ) : null}
        <View style={styles.leadBottomRow}>
          <AppText style={styles.leadPhone} color={theme.colors.textMuted} numberOfLines={1}>
            {item.contactPhone ?? item.contactEmail ?? ''}
          </AppText>
          {item.opportunity && (
            <AppText style={styles.dealValue} color={theme.colors.text}>
              {formatDealValue(Number(item.opportunity.value))}
            </AppText>
          )}
        </View>
      </View>
      <AppText style={styles.chevron} color={theme.colors.textMuted}>›</AppText>
    </TouchableOpacity>
  );
}

export function LeadsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { value: search, debouncedValue: debouncedSearch, onChange: handleSearch } = useDebounceSearch();
  const [activeFilter, setActiveFilter] = useState<FilterTab>(FILTER_TABS[0]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['leads', debouncedSearch, activeFilter.status, activeFilter.opportunityStage],
      queryFn: ({ pageParam }) =>
        leadsApi.list({
          page: pageParam as number,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: activeFilter.status,
          opportunityStage: activeFilter.opportunityStage,
        }).then(r => r.data),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const fetched = lastPage.page * lastPage.pageSize;
        return fetched < lastPage.total ? lastPage.page + 1 : undefined;
      },
    });

  const leads = data?.pages.flatMap(p => p.items) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  return (
    <Screen edges={['left', 'right']}>
      {/* Screen header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <AppText style={[styles.brandLabel, { color: theme.colors.primary }]}>IRIS CRM</AppText>
            <AppText style={styles.pageTitle} color={theme.colors.text}>Leads</AppText>
            <AppText style={styles.pageSubtitle} color={theme.colors.textMuted}>
              {totalCount > 0 ? `${totalCount} opportunities in motion` : 'Your pipeline starts here'}
            </AppText>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('LeadCreate')}
              style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Plus size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <NotificationBell size={40} onPress={() => navigation.navigate('Notifications')} />
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surfaceAlt, borderRadius: 12 }]}>
          <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder="Search leads or companies"
            placeholderTextColor={theme.colors.textMuted}
            style={{ ...styles.searchInput, color: theme.colors.text } as TextStyle}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {FILTER_TABS.map(f => {
            const active = f.label === activeFilter.label;
            return (
              <TouchableOpacity
                key={f.label}
                onPress={() => setActiveFilter(f)}
                style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border }]}
              >
                <AppText style={{ ...styles.chipText, color: active ? '#FFF' : theme.colors.textSecondary } as TextStyle}>
                  {f.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={i => String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={() => <SkeletonLeadCard />}
        />
      ) : isError ? (
        <EmptyState title="Could not load leads" message="Check your connection" action={{ label: 'Retry', onPress: refetch }} />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={leads.length > 0 ? (
            <View style={styles.listHeader}>
              <AppText style={styles.listCount} color={theme.colors.textSecondary}>{totalCount} leads</AppText>
              <AppText style={styles.listSort} color={theme.colors.textMuted}>Recently updated</AppText>
            </View>
          ) : undefined}
          ListFooterComponent={isFetchingNextPage
            ? () => <View style={styles.footerLoader}><ActivityIndicator color={theme.colors.primary} size="small" /></View>
            : undefined}
          ListEmptyComponent={
            <EmptyState
              title="No leads found"
              message={debouncedSearch ? 'Try different search terms' : 'Tap + to add your first lead'}
            />
          }
          renderItem={({ item }) => (
            <LeadCard item={item} onPress={() => navigation.navigate('LeadDetail', { id: item.id })} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  brandLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  pageTitle: { fontSize: 28, fontFamily: 'Inter-Bold', lineHeight: 34 },
  pageSubtitle: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bellBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular', paddingVertical: 0 },
  filterScroll: { marginHorizontal: -4 },
  filterRow: { paddingHorizontal: 4, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Inter-Medium' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listCount: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  listSort: { fontSize: 12, fontFamily: 'Inter-Regular' },
  list: { padding: 16, paddingBottom: 24 },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  leadAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  leadAvatarText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  leadInfo: { flex: 1, gap: 3 },
  leadTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leadName: { flex: 1, fontSize: 15, fontFamily: 'Inter-SemiBold' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  leadCompany: { fontSize: 13, fontFamily: 'Inter-Regular' },
  leadNote: { fontSize: 12, fontFamily: 'Inter-Regular' },
  leadBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  leadPhone: { fontSize: 12, fontFamily: 'Inter-Regular', flex: 1 },
  dealValue: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  chevron: { fontSize: 22, lineHeight: 26, marginLeft: 2 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
