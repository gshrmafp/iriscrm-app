import React, { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView, View, StyleSheet, RefreshControl, TouchableOpacity, Animated as RNAnimated,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus, TrendingUp, Users, Clock, Building2,
  Phone, Mail, CalendarCheck, MapPin, User, FileText,
  ChevronRight, CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { NotificationBell } from '@/components/common/NotificationBell';
import { useAppSelector } from '@/app/store/hooks';
import { dashboardApi } from '@/services/api/dashboard.api';
import { leadsApi, FollowUp, Lead } from '@/services/api/leads.api';
import { customersApi } from '@/services/api/customers.api';
import { isDueToday, isOverdue } from '@/utils/date';
import { DARK_NAVY } from '@/constants/brandColors';
import { SalesStackParamList } from '@/features/sales/navigation/types';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const CHANNEL_ICON: Record<string, React.ComponentType<any>> = {
  call: Phone, email: Mail, meeting: CalendarCheck, visit: Building2,
};

/* ── Helpers ──────────────────────────────────────────────────────── */

function greeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name}`;
}

function fmtDate() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
}

function formatPipeline(val?: number) {
  if (!val) return '—';
  return `₹${val.toLocaleString('en-IN')}`;
}

function isWithinNextWeek(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  return d >= now && d <= now + 7 * 24 * 60 * 60 * 1000;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ── Skeleton ─────────────────────────────────────────────────────── */

function useShimmer() {
  const anim = useRef(new RNAnimated.Value(0.35)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(anim, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

function Bone({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  const theme = useTheme();
  const opacity = useShimmer();
  return (
    <RNAnimated.View
      style={[{ width: width as any, height, borderRadius: radius, backgroundColor: theme.colors.border, opacity }, style]}
    />
  );
}

function SkeletonScreen() {
  const theme = useTheme();
  return (
    <>
      {/* Greeting */}
      <View style={[st.greetCard, { backgroundColor: DARK_NAVY }]}>
        <View style={{ flex: 1, gap: 8 }}>
          <Bone width={100} height={10} style={{ opacity: 0.25 }} />
          <Bone width={180} height={20} style={{ opacity: 0.25 }} />
          <Bone width={140} height={12} style={{ opacity: 0.25 }} />
        </View>
      </View>
      {/* Stats */}
      <View style={st.statsRow}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[st.miniStat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Bone width={28} height={28} radius={8} />
            <Bone width={30} height={18} radius={4} style={{ marginTop: 6 }} />
            <Bone width={50} height={9} radius={3} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      {/* Leads */}
      {[1, 2].map(i => (
        <View key={i} style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Bone width={120} height={14} style={{ marginBottom: 10 }} />
          {[1, 2].map(j => (
            <View key={j} style={[st.leadRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Bone width={32} height={32} radius={8} />
              <View style={{ flex: 1, gap: 4 }}>
                <Bone width={'60%' as any} height={13} />
                <Bone width={'40%' as any} height={10} />
              </View>
              <Bone width={30} height={10} />
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

/* ── Components ───────────────────────────────────────────────────── */

function ScreenHeader({ name, onBellPress }: { name: string; onBellPress: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.screenHeader, { paddingTop: insets.top + 4, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <View style={{ flex: 1 }}>
        <AppText style={st.brandLabel} color={theme.colors.primary}>IRIS CRM</AppText>
        <AppText style={st.headerName} color={theme.colors.text}>{greeting(name)}</AppText>
      </View>
      <NotificationBell onPress={onBellPress} />
    </View>
  );
}

function LeadRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const theme = useTheme();
  const step = lead.currentStep ?? 1;
  const displayName = lead.companyName || lead.contactName || 'New Lead';
  const age = timeAgo(lead.updatedAt || lead.createdAt);
  const isDraft = step < 3;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[st.leadRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[st.leadIcon, { backgroundColor: isDraft ? '#FEF3C7' : '#D1FAE5' }]}>
        {step <= 1
          ? <MapPin size={14} color="#D97706" strokeWidth={2} />
          : step === 2
            ? <User size={14} color="#D97706" strokeWidth={2} />
            : <CheckCircle2 size={14} color="#059669" strokeWidth={2} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={st.leadName} color={theme.colors.text} numberOfLines={1}>{displayName}</AppText>
        <AppText style={st.leadMeta} color={theme.colors.textMuted}>
          {lead.refNo}{isDraft ? ` · Step ${step}/3` : ''}
        </AppText>
      </View>
      <AppText style={st.leadAge} color={theme.colors.textMuted}>{age}</AppText>
      <ChevronRight size={14} color={theme.colors.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

function FollowUpRow({ item, onPress }: { item: FollowUp; onPress: () => void }) {
  const theme = useTheme();
  const overdue = isOverdue(item.nextActionAt);
  const dueToday = isDueToday(item.nextActionAt);
  const dateLabel = item.nextActionAt ? formatShortDate(item.nextActionAt) : '';
  const ChannelIcon = CHANNEL_ICON[item.channel] ?? CalendarCheck;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[st.leadRow, { backgroundColor: theme.colors.surface, borderColor: overdue ? '#FECACA' : theme.colors.border }]}>
      <View style={[st.leadIcon, { backgroundColor: overdue ? '#FEE2E2' : dueToday ? '#FEF3C7' : theme.colors.primaryLight }]}>
        <ChannelIcon size={14} color={overdue ? '#DC2626' : dueToday ? '#D97706' : theme.colors.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={st.leadName} color={theme.colors.text} numberOfLines={1}>{item.note}</AppText>
        {item.lead && (
          <AppText style={st.leadMeta} color={theme.colors.textMuted} numberOfLines={1}>
            {item.lead.companyName ?? item.lead.contactName}
          </AppText>
        )}
      </View>
      <AppText style={st.leadAge} color={overdue ? '#DC2626' : theme.colors.textMuted}>
        {overdue ? 'Overdue' : dateLabel}
      </AppText>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, count, dotColor, onViewAll }: { title: string; count: number; dotColor: string; onViewAll?: () => void }) {
  const theme = useTheme();
  return (
    <View style={st.sectionHeader}>
      <View style={st.sectionLeft}>
        <View style={[st.sectionDot, { backgroundColor: dotColor }]} />
        <AppText style={st.sectionTitle} color={theme.colors.text}>{title}</AppText>
        <View style={[st.badge, { backgroundColor: dotColor + '22' }]}>
          <AppText style={st.badgeText} color={dotColor}>{count}</AppText>
        </View>
      </View>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText style={st.viewAll} color={theme.colors.primary}>View all</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

export function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(s => s.auth.user);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const { data: leadSummary, isFetching: ls, isLoading: lsInit, refetch: r1 } = useQuery({
    queryKey: ['lead-dashboard-summary', refreshKey],
    queryFn: () => leadsApi.dashboardSummary().then(r => r.data),
    staleTime: 60_000,
  });

  const { data: oppData, isFetching: of_, isLoading: ofInit, refetch: r2 } = useQuery({
    queryKey: ['opportunity-stats', refreshKey],
    queryFn: () => dashboardApi.opportunityStats().then(r => r.data),
    staleTime: 60_000,
  });

  const { data: followUpsData, isFetching: ff, isLoading: ffInit, refetch: r3 } = useQuery({
    queryKey: ['follow-ups-dashboard', refreshKey],
    queryFn: () => leadsApi.followUpsFeed({ page: 1, pageSize: 20 }).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: customerSummary, isFetching: cs, isLoading: csInit, refetch: r4 } = useQuery({
    queryKey: ['customers-summary', refreshKey],
    queryFn: () => customersApi.summary().then(r => r.data),
    staleTime: 60_000,
  });

  const { data: recentLeadsData, isFetching: rl, isLoading: rlInit, refetch: r5 } = useQuery({
    queryKey: ['recent-leads-home', refreshKey],
    queryFn: () => leadsApi.list({ page: 1, pageSize: 20 }).then(r => r.data),
    staleTime: 60_000,
  });

  const isInitialLoad = lsInit || ofInit || ffInit || csInit || rlInit;
  const refreshing = !isInitialLoad && (ls || of_ || ff || cs || rl);
  const onRefresh = () => { setRefreshKey(k => k + 1); r1(); r2(); r3(); r4(); r5(); };

  useFocusEffect(
    useCallback(() => { r1(); r2(); r3(); r4(); r5(); }, [r1, r2, r3, r4, r5]),
  );

  const name = user?.name?.split(' ')[0] ?? 'there';

  const totalLeads = leadSummary?.activeCount ?? 0;
  const totalFollowUps = followUpsData?.total ?? 0;
  const totalCustomers = customerSummary?.total ?? 0;
  const pipelineValue = oppData?.pipelineValue;
  const openOpps = oppData?.openCount ?? 0;

  const allFollowUps = followUpsData?.items ?? [];
  const overdueFollowUps = allFollowUps.filter(item => isOverdue(item.nextActionAt) && !isDueToday(item.nextActionAt));
  const todayFollowUps = allFollowUps.filter(item => isDueToday(item.nextActionAt));
  const upcomingFollowUps = allFollowUps.filter(item => isWithinNextWeek(item.nextActionAt) && !isDueToday(item.nextActionAt) && !isOverdue(item.nextActionAt));

  const allLeads = recentLeadsData?.items ?? [];
  const newVisitLeads = allLeads.filter(l => (l.currentStep ?? 3) === 1);
  const contactedLeads = allLeads.filter(l => (l.currentStep ?? 3) === 2);
  const qualifiedLeads = allLeads.filter(l => l.status === 'QUALIFIED' || (l.currentStep ?? 0) >= 3);

  const goLeads = (filter?: string) => navigation.navigate('SalesTabs', { screen: 'Leads', params: filter ? { filter } : undefined });

  return (
    <Screen edges={['left', 'right']}>
      <ScreenHeader name={name} onBellPress={() => navigation.navigate('Notifications')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {isInitialLoad ? <SkeletonScreen /> : (
          <>
            {/* Date banner */}
            <View style={[st.greetCard, { backgroundColor: DARK_NAVY }]}>
              <View style={{ flex: 1 }}>
                <AppText style={st.greetDate}>{fmtDate()}</AppText>
                <AppText style={st.greetSub}>{"Here's your focus for today."}</AppText>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('LeadCreate')} style={st.fabMini} activeOpacity={0.8}>
                <Plus size={18} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Compact stats — single row */}
            <View style={st.statsRow}>
              <View style={[st.miniStat, { backgroundColor: DARK_NAVY, borderWidth: 0 }]}>
                <TrendingUp size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <AppText style={st.miniStatValueDark}>{formatPipeline(pipelineValue)}</AppText>
                <AppText style={st.miniStatLabelDark}>Pipeline</AppText>
              </View>
              <View style={[st.miniStat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Users size={16} color={theme.colors.primary} strokeWidth={2} />
                <AppText style={st.miniStatValue} color={theme.colors.text}>{totalLeads}</AppText>
                <AppText style={st.miniStatLabel} color={theme.colors.textMuted}>Leads</AppText>
              </View>
              <View style={[st.miniStat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Clock size={16} color={theme.colors.primary} strokeWidth={2} />
                <AppText style={st.miniStatValue} color={theme.colors.text}>{totalFollowUps}</AppText>
                <AppText style={st.miniStatLabel} color={theme.colors.textMuted}>Follow-ups</AppText>
              </View>
              <View style={[st.miniStat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Building2 size={16} color={theme.colors.primary} strokeWidth={2} />
                <AppText style={st.miniStatValue} color={theme.colors.text}>{totalCustomers}</AppText>
                <AppText style={st.miniStatLabel} color={theme.colors.textMuted}>Customers</AppText>
              </View>
            </View>

            {/* New Visit Leads */}
            {newVisitLeads.length > 0 && (
              <View style={st.section}>
                <SectionHeader title="New Visit" count={newVisitLeads.length} dotColor="#F59E0B" onViewAll={() => goLeads('draft')} />
                {newVisitLeads.slice(0, 3).map(lead => (
                  <LeadRow key={lead.id} lead={lead} onPress={() => navigation.navigate('LeadCreate', { resumeLeadId: lead.id })} />
                ))}
              </View>
            )}

            {/* Contacted Leads */}
            {contactedLeads.length > 0 && (
              <View style={st.section}>
                <SectionHeader title="Contacted" count={contactedLeads.length} dotColor="#3B82F6" onViewAll={() => goLeads('draft')} />
                {contactedLeads.slice(0, 3).map(lead => (
                  <LeadRow key={lead.id} lead={lead} onPress={() => navigation.navigate('LeadCreate', { resumeLeadId: lead.id })} />
                ))}
              </View>
            )}

            {/* Qualified Leads */}
            {qualifiedLeads.length > 0 && (
              <View style={st.section}>
                <SectionHeader title="Qualified" count={qualifiedLeads.length} dotColor="#059669" onViewAll={() => goLeads('qualified')} />
                {qualifiedLeads.slice(0, 3).map(lead => (
                  <LeadRow key={lead.id} lead={lead} onPress={() => navigation.navigate('LeadDetail', { id: lead.id })} />
                ))}
              </View>
            )}

            {/* Overdue */}
            {overdueFollowUps.length > 0 && (
              <View style={st.section}>
                <SectionHeader title="Overdue" count={overdueFollowUps.length} dotColor="#DC2626" />
                {overdueFollowUps.slice(0, 3).map((item: FollowUp) => (
                  <FollowUpRow key={item.id} item={item} onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })} />
                ))}
              </View>
            )}

            {/* Today's follow-ups */}
            {todayFollowUps.length > 0 && (
              <View style={st.section}>
                <SectionHeader title="Due Today" count={todayFollowUps.length} dotColor="#D97706" />
                {todayFollowUps.slice(0, 4).map((item: FollowUp) => (
                  <FollowUpRow key={item.id} item={item} onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })} />
                ))}
              </View>
            )}

            {/* Upcoming */}
            {upcomingFollowUps.length > 0 && (
              <View style={st.section}>
                <SectionHeader title="This Week" count={upcomingFollowUps.length} dotColor="#3B82F6" />
                {upcomingFollowUps.slice(0, 4).map((item: FollowUp) => (
                  <FollowUpRow key={item.id} item={item} onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })} />
                ))}
              </View>
            )}

            {/* Empty */}
            {allLeads.length === 0 && allFollowUps.length === 0 && (
              <View style={[st.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <CalendarCheck size={24} color={theme.colors.textMuted} strokeWidth={1.5} />
                <AppText style={st.emptyText} color={theme.colors.textMuted}>No leads or follow-ups yet</AppText>
                <TouchableOpacity onPress={() => navigation.navigate('LeadCreate')} style={[st.emptyBtn, { backgroundColor: theme.colors.primary }]} activeOpacity={0.8}>
                  <Plus size={16} color="#FFF" strokeWidth={2.5} />
                  <AppText style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#FFF' }}>Create your first lead</AppText>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandLabel: { fontSize: 10, fontFamily: 'Inter-SemiBold', letterSpacing: 1.2, marginBottom: 1 },
  headerName: { fontSize: 18, fontFamily: 'Inter-SemiBold', lineHeight: 22 },
  scroll: { paddingBottom: 24 },

  greetCard: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  greetDate: { fontSize: 10, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8 },
  greetSub: { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  fabMini: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },

  statsRow: {
    flexDirection: 'row', paddingHorizontal: 12,
    gap: 8, marginTop: 12,
  },
  miniStat: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, alignItems: 'center', gap: 2,
  },
  miniStatValue: { fontSize: 20, fontFamily: 'Inter-Bold', lineHeight: 24, marginTop: 4 },
  miniStatLabel: { fontSize: 10, fontFamily: 'Inter-Medium' },
  miniStatValueDark: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#FFF', lineHeight: 18, marginTop: 4 },
  miniStatLabelDark: { fontSize: 10, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.6)' },

  section: { marginTop: 16, paddingHorizontal: 12 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, marginBottom: 8,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Inter-Bold' },
  viewAll: { fontSize: 12, fontFamily: 'Inter-Medium' },

  leadRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 10,
    gap: 10, marginBottom: 6,
  },
  leadIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  leadName: { fontSize: 13, fontFamily: 'Inter-SemiBold', lineHeight: 17 },
  leadMeta: { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 1 },
  leadAge: { fontSize: 10, fontFamily: 'Inter-Medium', marginRight: 2 },

  emptyCard: {
    margin: 16, borderRadius: 14, borderWidth: 1,
    padding: 20, alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 13, fontFamily: 'Inter-Regular' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
});
