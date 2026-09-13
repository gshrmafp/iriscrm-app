import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, MapPin, User, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { NotificationBell } from '@/components/common/NotificationBell';
import { SkeletonLeadCard, EmptyState } from '@/components/feedback';
import { useDebounceSearch } from '@/hooks/useDebounceSearch';
import { SalesStackParamList, SalesTabParamList } from '@/features/sales/navigation/types';
import { leadsApi, Lead } from '@/services/api/leads.api';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  NEW:       { label: 'New',       bg: '#FEF3C7', color: '#D97706' },
  QUALIFIED: { label: 'Qualified', bg: '#D1FAE5', color: '#065F46' },
  LOST:      { label: 'Lost',      bg: '#FEE2E2', color: '#991B1B' },
};

const OPPORTUNITY_STAGE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  NEW:         { label: 'New Visit',   bg: '#DBEAFE', color: '#1D4ED8' },
  CONTACTED:   { label: 'Contacted',   bg: '#E9D5FF', color: '#7C3AED' },
  QUALIFIED:   { label: 'Qualified',   bg: '#D1FAE5', color: '#065F46' },
  QUOTED:      { label: 'Quotation',   bg: '#FEF3C7', color: '#D97706' },
  NEGOTIATION: { label: 'Follow-ups',  bg: '#FFEDD5', color: '#C2410C' },
  MEETING:     { label: 'Meeting',     bg: '#E0E7FF', color: '#4338CA' },
  WON:         { label: 'PO',          bg: '#DCFCE7', color: '#15803D' },
  LOST:        { label: 'Lost',        bg: '#FEE2E2', color: '#991B1B' },
};

const STEP_META = [
  { label: 'Site Visit', icon: MapPin },
  { label: 'Contact', icon: User },
  { label: 'Qualify', icon: FileText },
];

type FilterTab = {
  key: string;
  label: string;
  emoji?: string;
  status?: string;
  opportunityStage?: string;
  isDraft?: boolean;
};

const FILTER_TABS: FilterTab[] = [
  { key: 'all',        label: 'All' },
  { key: 'draft',      label: 'Drafts',     emoji: '📝', isDraft: true },
  { key: 'new',        label: 'New',        emoji: '🔵', status: 'NEW' },
  { key: 'qualified',  label: 'Qualified',  emoji: '✅', status: 'QUALIFIED' },
  { key: 'quoted',     label: 'Quotation',  emoji: '📄', opportunityStage: 'QUOTED' },
  { key: 'followups',  label: 'Follow-ups', emoji: '📞', opportunityStage: 'NEGOTIATION' },
  { key: 'meeting',    label: 'Meeting',    emoji: '🤝', opportunityStage: 'MEETING' },
  { key: 'won',        label: 'PO',         emoji: '🏆', opportunityStage: 'WON' },
  { key: 'lost',       label: 'Lost',       emoji: '❌', status: 'LOST' },
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
  return `₹${val.toLocaleString('en-IN')}`;
}

function timeAgoLabel(dateStr?: string): string {
  if (!dateStr) return '';
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function StepProgress({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <View style={stepStyles.row}>
      {STEP_META.map((s, i) => {
        const done = i < step;
        const current = i === step;
        const StepIcon = s.icon;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={[stepStyles.line, { backgroundColor: done ? '#10B981' : theme.colors.border }]} />
            )}
            <View style={stepStyles.item}>
              <View style={[
                stepStyles.dot,
                done
                  ? { backgroundColor: '#D1FAE5', borderColor: '#10B981' }
                  : current
                    ? { backgroundColor: '#FEF3C7', borderColor: '#D97706' }
                    : { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
              ]}>
                <StepIcon size={8} color={done ? '#10B981' : current ? '#D97706' : theme.colors.textMuted} strokeWidth={2.5} />
              </View>
              <AppText style={[stepStyles.label, { color: done ? '#10B981' : current ? '#D97706' : theme.colors.textMuted }]}>
                {s.label}
              </AppText>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  item: { alignItems: 'center', gap: 2 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  line: { flex: 1, height: 1.5, borderRadius: 1, marginHorizontal: 3, marginBottom: 14 },
  label: { fontSize: 8, fontFamily: 'Inter-Medium' },
});

function LeadCard({ item, onPress }: { item: Lead; onPress: () => void }) {
  const theme = useTheme();
  const isDraft = (item.currentStep ?? 3) < 3;
  const displayName = item.contactName || item.companyName || 'Unknown';
  const company = item.companyName;
  const badge = isDraft
    ? { label: `Draft · Step ${item.currentStep ?? 1}/3`, bg: '#FEF3C7', color: '#D97706' }
    : item.opportunity
      ? OPPORTUNITY_STAGE_BADGE[item.opportunity.stage] ?? { label: item.opportunity.stage, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted }
      : STATUS_BADGE[item.status] ?? { label: item.status, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted };
  const avatarBg = avatarColor(displayName);
  const ini = initials(displayName);
  const age = timeAgoLabel(item.updatedAt || item.createdAt);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.leadCard, { backgroundColor: theme.colors.surface, borderColor: isDraft ? '#FDE68A' : theme.colors.border }]}>
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

        {/* Draft leads show step progress instead of notes */}
        {isDraft ? (
          <StepProgress step={item.currentStep ?? 1} />
        ) : (
          <>
            {item.notes ? (
              <AppText style={styles.leadNote} color={theme.colors.textMuted} numberOfLines={1}>
                {item.notes}
              </AppText>
            ) : null}
          </>
        )}

        <View style={styles.leadBottomRow}>
          <View style={styles.leadBottomLeft}>
            <AppText style={styles.leadRef} color={theme.colors.textMuted} numberOfLines={1}>
              {item.refNo}
            </AppText>
            {age ? (
              <AppText style={styles.leadAge} color={theme.colors.textMuted}>
                · {age}
              </AppText>
            ) : null}
          </View>
          {item.opportunity && (
            <AppText style={styles.dealValue} color={theme.colors.text}>
              {formatDealValue(Number(item.opportunity.value))}
            </AppText>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function LeadsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<SalesTabParamList, 'Leads'>>();
  const insets = useSafeAreaInsets();
  const { value: search, debouncedValue: debouncedSearch, onChange: handleSearch } = useDebounceSearch();

  const initialFilter = route.params?.filter
    ? FILTER_TABS.find(f => f.key === route.params!.filter) ?? FILTER_TABS[0]
    : FILTER_TABS[0];
  const [activeFilter, setActiveFilter] = useState<FilterTab>(initialFilter);

  useEffect(() => {
    if (route.params?.filter) {
      const matched = FILTER_TABS.find(f => f.key === route.params!.filter);
      if (matched) setActiveFilter(matched);
    }
  }, [route.params?.filter]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['leads', debouncedSearch, activeFilter.key],
      queryFn: ({ pageParam }) =>
        leadsApi.list({
          page: pageParam as number,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: activeFilter.isDraft ? 'NEW' : activeFilter.status,
          opportunityStage: activeFilter.opportunityStage,
        }).then(r => r.data),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const fetched = lastPage.page * lastPage.pageSize;
        return fetched < lastPage.total ? lastPage.page + 1 : undefined;
      },
      refetchOnMount: 'always',
    });

  const allLeads = data?.pages.flatMap(p => p.items) ?? [];
  // Client-side filter for drafts since backend doesn't have a draft status
  const leads = activeFilter.isDraft
    ? allLeads.filter(l => (l.currentStep ?? 3) < 3)
    : allLeads;
  const totalCount = activeFilter.isDraft ? leads.length : (data?.pages[0]?.total ?? 0);

  return (
    <Screen edges={['left', 'right']}>
      {/* Screen header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <AppText style={[styles.brandLabel, { color: theme.colors.primary }]}>IRIS CRM</AppText>
            <AppText style={styles.pageTitle} color={theme.colors.text}>Leads</AppText>
            <AppText style={styles.pageSubtitle} color={theme.colors.textMuted}>
              {totalCount > 0 ? `${totalCount} leads` : 'Your pipeline starts here'}
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
            const active = f.key === activeFilter.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                {f.emoji && !active ? (
                  <AppText style={styles.chipEmoji}>{f.emoji}</AppText>
                ) : null}
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
              title={activeFilter.isDraft ? 'No draft leads' : 'No leads found'}
              message={debouncedSearch ? 'Try different search terms' : activeFilter.isDraft ? 'All your leads are complete' : 'Tap + to add your first lead'}
            />
          }
          renderItem={({ item }) => (
            <LeadCard item={item} onPress={() => {
              if ((item.currentStep ?? 3) < 3) {
                navigation.navigate('LeadCreate', { resumeLeadId: item.id });
              } else {
                navigation.navigate('LeadDetail', { id: item.id });
              }
            }} />
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular', paddingVertical: 0 },
  filterScroll: { marginHorizontal: -4 },
  filterRow: { paddingHorizontal: 4, gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  chipEmoji: { fontSize: 12 },
  chipText: { fontSize: 13, fontFamily: 'Inter-Medium' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listCount: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  listSort: { fontSize: 12, fontFamily: 'Inter-Regular' },
  list: { padding: 16, paddingBottom: 24 },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  leadAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  leadAvatarText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  leadInfo: { flex: 1, gap: 3 },
  leadTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leadName: { flex: 1, fontSize: 15, fontFamily: 'Inter-SemiBold' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontFamily: 'Inter-SemiBold' },
  leadCompany: { fontSize: 13, fontFamily: 'Inter-Regular' },
  leadNote: { fontSize: 12, fontFamily: 'Inter-Regular' },
  leadBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  leadBottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  leadRef: { fontSize: 11, fontFamily: 'Inter-Medium' },
  leadAge: { fontSize: 11, fontFamily: 'Inter-Regular' },
  dealValue: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
