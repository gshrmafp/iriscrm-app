import React from 'react';
import {
  ScrollView, View, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus, PenLine, Search, TrendingUp, Users, Clock, Building2,
  Phone, Mail, CalendarCheck, ChevronRight, MapPin, User, FileText,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { NotificationBell } from '@/components/common/NotificationBell';
import { useAppSelector } from '@/app/store/hooks';
import { dashboardApi } from '@/services/api/dashboard.api';
import { leadsApi, FollowUp, Lead } from '@/services/api/leads.api';
import { customersApi } from '@/services/api/customers.api';
import { isDueToday, isOverdue, formatFollowUpTime } from '@/utils/date';
import { DARK_NAVY } from '@/constants/brandColors';
import { SalesStackParamList } from '@/features/sales/navigation/types';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#DC2626', high: '#DC2626', medium: '#D97706', low: '#6B7280',
};

const PRIORITY_BG: Record<string, string> = {
  urgent: '#FEE2E2', high: '#FEE2E2', medium: '#FEF3C7', low: '#F1F5F9',
};

const CHANNEL_ICON: Record<string, React.ComponentType<any>> = {
  call: Phone,
  email: Mail,
  meeting: CalendarCheck,
  visit: Building2,
};

const STEP_META = [
  { label: 'Site Visit', icon: MapPin },
  { label: 'Contact', icon: User },
  { label: 'Qualification', icon: FileText },
];

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
  if (val >= 10_00_000) return `₹${(val / 10_00_000).toFixed(1)}M`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  return `₹${(val / 1000).toFixed(0)}k`;
}

function isWithinNextWeek(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  const weekLater = now + 7 * 24 * 60 * 60 * 1000;
  return d >= now && d <= weekLater;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function ScreenHeader({ title, subtitle, onBellPress }: { title: string; subtitle: string; onBellPress: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screenHeader, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <View style={{ flex: 1 }}>
        <AppText style={[styles.brandLabel, { color: theme.colors.primary }]}>IRIS CRM</AppText>
        <AppText variant="h2" color={theme.colors.text}>{title}</AppText>
        <AppText variant="caption" color={theme.colors.textMuted}>{subtitle}</AppText>
      </View>
      <NotificationBell onPress={onBellPress} />
    </View>
  );
}

function DraftLeadCard({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const theme = useTheme();
  const step = lead.currentStep ?? 1;
  const displayName = lead.companyName || lead.contactName || 'New Lead';
  const timeAgo = lead.updatedAt || lead.createdAt;
  const ageMs = Date.now() - new Date(timeAgo).getTime();
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageLabel = ageHours < 1 ? 'Just now' : ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.draftCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={styles.draftHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.draftName} color={theme.colors.text} numberOfLines={1}>
            {displayName}
          </AppText>
          <AppText style={styles.draftRef} color={theme.colors.textMuted}>
            {lead.refNo} · {ageLabel}
          </AppText>
        </View>
        <View style={[styles.draftBadge, { backgroundColor: '#FEF3C7' }]}>
          <AppText style={styles.draftBadgeText} color="#D97706">
            Step {step}/3
          </AppText>
        </View>
      </View>

      {/* Step progress */}
      <View style={styles.stepRow}>
        {STEP_META.map((s, i) => {
          const done = i < step;
          const current = i === step;
          const StepIcon = s.icon;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <View style={[styles.stepLine, { backgroundColor: done ? '#10B981' : theme.colors.border }]} />
              )}
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  done
                    ? { backgroundColor: '#D1FAE5', borderColor: '#10B981' }
                    : current
                      ? { backgroundColor: '#FEF3C7', borderColor: '#D97706' }
                      : { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
                ]}>
                  <StepIcon size={10} color={done ? '#10B981' : current ? '#D97706' : theme.colors.textMuted} strokeWidth={2.5} />
                </View>
                <AppText style={[styles.stepLabel, { color: done ? '#10B981' : current ? '#D97706' : theme.colors.textMuted }]}>
                  {s.label}
                </AppText>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.draftFooter}>
        <AppText style={styles.draftCta} color={theme.colors.primary}>
          Continue →
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

function FollowUpCard({ item, onPress }: { item: FollowUp; onPress: () => void }) {
  const theme = useTheme();
  const priority = item.priority ?? 'MEDIUM';
  const priorityKey = priority.toLowerCase();
  const overdue = isOverdue(item.nextActionAt);
  const dueToday = isDueToday(item.nextActionAt);
  const dateLabel = item.nextActionAt ? formatShortDate(item.nextActionAt) : 'No date';
  const timeStr = item.nextActionAt ? new Date(item.nextActionAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const ChannelIcon = CHANNEL_ICON[item.channel] ?? CalendarCheck;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.followCard, { backgroundColor: theme.colors.surface, borderColor: overdue ? '#FCA5A5' : theme.colors.border }]}
    >
      <View style={[styles.followIconWrap, { backgroundColor: overdue ? '#FEE2E2' : dueToday ? '#FEF3C7' : theme.colors.primaryLight }]}>
        <ChannelIcon size={14} color={overdue ? '#DC2626' : dueToday ? '#D97706' : theme.colors.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.followNote} color={theme.colors.text} numberOfLines={1}>
          {item.note}
        </AppText>
        {item.lead && (
          <AppText style={styles.followCompany} color={theme.colors.textMuted} numberOfLines={1}>
            {item.lead.companyName ?? item.lead.contactName}
          </AppText>
        )}
      </View>
      <View style={styles.followRight}>
        <AppText style={styles.followDate} color={overdue ? '#DC2626' : theme.colors.textMuted}>
          {overdue ? 'Overdue' : dateLabel}
        </AppText>
        {timeStr ? (
          <AppText style={styles.followTime} color={theme.colors.textMuted}>
            {timeStr}
          </AppText>
        ) : null}
        <View style={[styles.followPriority, { backgroundColor: PRIORITY_BG[priorityKey] ?? PRIORITY_BG.medium }]}>
          <AppText style={styles.followPriorityText} color={PRIORITY_COLORS[priorityKey] ?? PRIORITY_COLORS.medium}>
            {priorityKey.charAt(0).toUpperCase() + priorityKey.slice(1)}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(s => s.auth.user);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const { data: leadSummary, isFetching: ls, refetch: r1 } = useQuery({
    queryKey: ['lead-dashboard-summary', refreshKey],
    queryFn: () => leadsApi.dashboardSummary().then(r => r.data),
    staleTime: 60_000,
  });

  const { data: oppData, isFetching: of_, refetch: r2 } = useQuery({
    queryKey: ['opportunity-stats', refreshKey],
    queryFn: () => dashboardApi.opportunityStats().then(r => r.data),
    staleTime: 60_000,
  });

  const { data: followUpsData, isFetching: ff, refetch: r3 } = useQuery({
    queryKey: ['follow-ups-dashboard', refreshKey],
    queryFn: () => leadsApi.followUpsFeed({ page: 1, pageSize: 20 }).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: customerSummary, isFetching: cs, refetch: r4 } = useQuery({
    queryKey: ['customers-summary', refreshKey],
    queryFn: () => customersApi.summary().then(r => r.data),
    staleTime: 60_000,
  });

  // Draft leads — incomplete stepped leads
  const { data: draftsData, isFetching: df, refetch: r5 } = useQuery({
    queryKey: ['draft-leads', refreshKey],
    queryFn: () => leadsApi.list({ page: 1, pageSize: 10, status: 'NEW' }).then(r => r.data),
    staleTime: 60_000,
    select: (page) => ({
      ...page,
      items: page.items.filter((l: Lead) => (l.currentStep ?? 3) < 3),
    }),
  });

  const refreshing = ls || of_ || ff || cs || df;
  const onRefresh = () => {
    setRefreshKey(k => k + 1);
    r1(); r2(); r3(); r4(); r5();
  };

  const totalLeads = leadSummary?.activeCount ?? 0;
  const needsAttention = leadSummary?.needAttentionCount ?? 0;
  const totalFollowUps = followUpsData?.total ?? 0;
  const totalCustomers = customerSummary?.total ?? 0;
  const newCustomersThisMonth = customerSummary?.newThisMonth ?? 0;
  const pipelineValue = oppData?.pipelineValue;

  const allFollowUps = followUpsData?.items ?? [];
  const todayFollowUps = allFollowUps.filter(item => isDueToday(item.nextActionAt));
  const overdueFollowUps = allFollowUps.filter(item => isOverdue(item.nextActionAt) && !isDueToday(item.nextActionAt));
  const upcomingFollowUps = allFollowUps.filter(item => isWithinNextWeek(item.nextActionAt) && !isDueToday(item.nextActionAt) && !isOverdue(item.nextActionAt));

  const draftLeads = draftsData?.items ?? [];

  const name = user?.name?.split(' ')[0] ?? 'there';

  return (
    <Screen edges={['left', 'right']}>
      <ScreenHeader title="Home" subtitle="Your sales command center" onBellPress={() => navigation.navigate('Notifications')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      >
        {/* Greeting card */}
        <View style={[styles.greetCard, { backgroundColor: DARK_NAVY }]}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.greetDate}>{fmtDate()}</AppText>
            <AppText style={styles.greetName}>{greeting(name)}</AppText>
            <AppText style={styles.greetSub}>{"Here's your focus for today."}</AppText>
          </View>
          <View style={styles.greetIcon}>
            <TrendingUp size={22} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
          </View>
        </View>

        {/* 2×2 stat grid */}
        <View style={styles.statGrid}>
          <View style={[styles.statCard, styles.statCardDark, { backgroundColor: DARK_NAVY }]}>
            <View style={styles.statIconRow}>
              <View style={styles.statIconDark}>
                <TrendingUp size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              </View>
            </View>
            <AppText style={styles.statLabelDark}>Open pipeline</AppText>
            <AppText style={styles.statValueDark}>{formatPipeline(pipelineValue)}</AppText>
            {(oppData?.openCount ?? 0) > 0 && (
              <AppText style={styles.statSubDark}>{oppData!.openCount} open opportunities</AppText>
            )}
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconLight, { backgroundColor: theme.colors.primaryLight }]}>
                <Users size={16} color={theme.colors.primary} strokeWidth={2} />
              </View>
            </View>
            <AppText style={styles.statLabel} color={theme.colors.textMuted}>Active leads</AppText>
            <AppText style={styles.statValue} color={theme.colors.text}>{totalLeads}</AppText>
            <AppText style={styles.statSubGreen}>{needsAttention > 0 ? `${needsAttention} need attention` : totalLeads > 0 ? 'All on track' : 'No leads yet'}</AppText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconLight, { backgroundColor: theme.colors.primaryLight }]}>
                <Clock size={16} color={theme.colors.primary} strokeWidth={2} />
              </View>
            </View>
            <AppText style={styles.statLabel} color={theme.colors.textMuted}>Follow-ups</AppText>
            <AppText style={styles.statValue} color={theme.colors.text}>{totalFollowUps}</AppText>
            <AppText style={styles.statSubGreen}>
              {overdueFollowUps.length > 0
                ? `${overdueFollowUps.length} overdue`
                : todayFollowUps.length > 0
                  ? `${todayFollowUps.length} due today`
                  : totalFollowUps > 0 ? 'None due today' : 'All clear'}
            </AppText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconLight, { backgroundColor: theme.colors.primaryLight }]}>
                <Building2 size={16} color={theme.colors.primary} strokeWidth={2} />
              </View>
            </View>
            <AppText style={styles.statLabel} color={theme.colors.textMuted}>Customers</AppText>
            <AppText style={styles.statValue} color={theme.colors.text}>{totalCustomers}</AppText>
            <AppText style={styles.statSubGreen}>{newCustomersThisMonth > 0 ? `+${newCustomersThisMonth} this month` : totalCustomers > 0 ? 'Active accounts' : 'None yet'}</AppText>
          </View>
        </View>

        {/* Draft / In-Progress Leads */}
        {draftLeads.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#F59E0B' }]} />
                <AppText style={styles.sectionTitle} color={theme.colors.text}>Pending Leads</AppText>
                <View style={[styles.countBadge, { backgroundColor: '#FEF3C7' }]}>
                  <AppText style={styles.countBadgeText} color="#D97706">{draftLeads.length}</AppText>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('SalesTabs', { screen: 'Leads' })}>
                <AppText style={[styles.viewAll, { color: theme.colors.primary }]}>View all</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.draftScroll}
            >
              {draftLeads.map((lead) => (
                <DraftLeadCard
                  key={lead.id}
                  lead={lead}
                  onPress={() => navigation.navigate('LeadCreate', { resumeLeadId: lead.id })}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Quick actions */}
        <View style={styles.sectionRow}>
          <AppText style={styles.sectionTitle} color={theme.colors.text}>Quick actions</AppText>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('LeadCreate')}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Plus size={20} color={theme.colors.primary} strokeWidth={2.5} />
            </View>
            <AppText style={styles.quickLabel} color={theme.colors.text}>New lead</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('SalesTabs', { screen: 'Activities' })}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <PenLine size={20} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <AppText style={styles.quickLabel} color={theme.colors.text}>Log activity</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('SalesTabs', { screen: 'Leads' })}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Search size={20} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <AppText style={styles.quickLabel} color={theme.colors.text}>Find a lead</AppText>
          </TouchableOpacity>
        </View>

        {/* Overdue follow-ups — attention required */}
        {overdueFollowUps.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#DC2626' }]} />
                <AppText style={styles.sectionTitle} color={theme.colors.text}>Overdue</AppText>
                <View style={[styles.countBadge, { backgroundColor: '#FEE2E2' }]}>
                  <AppText style={styles.countBadgeText} color="#DC2626">{overdueFollowUps.length}</AppText>
                </View>
              </View>
            </View>
            <View style={styles.followList}>
              {overdueFollowUps.slice(0, 3).map((item: FollowUp) => (
                <FollowUpCard
                  key={item.id}
                  item={item}
                  onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })}
                />
              ))}
            </View>
          </>
        )}

        {/* Today's follow-ups */}
        {todayFollowUps.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#D97706' }]} />
                <AppText style={styles.sectionTitle} color={theme.colors.text}>{"Today's Follow-ups"}</AppText>
                <View style={[styles.countBadge, { backgroundColor: '#FEF3C7' }]}>
                  <AppText style={styles.countBadgeText} color="#D97706">{todayFollowUps.length}</AppText>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('SalesTabs', { screen: 'Activities' })}>
                <AppText style={[styles.viewAll, { color: theme.colors.primary }]}>View all</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.followList}>
              {todayFollowUps.slice(0, 5).map((item: FollowUp) => (
                <FollowUpCard
                  key={item.id}
                  item={item}
                  onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })}
                />
              ))}
            </View>
          </>
        )}

        {/* Upcoming this week */}
        {upcomingFollowUps.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#3B82F6' }]} />
                <AppText style={styles.sectionTitle} color={theme.colors.text}>This Week</AppText>
                <View style={[styles.countBadge, { backgroundColor: '#DBEAFE' }]}>
                  <AppText style={styles.countBadgeText} color="#1D4ED8">{upcomingFollowUps.length}</AppText>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('SalesTabs', { screen: 'Activities' })}>
                <AppText style={[styles.viewAll, { color: theme.colors.primary }]}>View all</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.followList}>
              {upcomingFollowUps.slice(0, 5).map((item: FollowUp) => (
                <FollowUpCard
                  key={item.id}
                  item={item}
                  onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })}
                />
              ))}
            </View>
          </>
        )}

        {/* Empty state when no follow-ups at all */}
        {allFollowUps.length === 0 && !ff && (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <CalendarCheck size={28} color={theme.colors.textMuted} strokeWidth={1.5} />
            <AppText style={styles.emptyTitle} color={theme.colors.text}>No follow-ups scheduled</AppText>
            <AppText style={styles.emptySubtitle} color={theme.colors.textMuted}>
              Log a follow-up on any lead to see it here
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  scroll: { paddingBottom: 32 },

  greetCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetDate: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  greetName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  greetSub: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  greetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    width: '47.5%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  statCardDark: { borderWidth: 0 },
  statIconRow: { marginBottom: 6 },
  statIconDark: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  statIconLight: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statLabelDark: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.65)' },
  statValueDark: { fontSize: 26, fontFamily: 'Inter-Bold', color: '#FFFFFF', lineHeight: 32 },
  statSubDark: { fontSize: 11, fontFamily: 'Inter-Medium', color: '#6EE7B7' },
  statLabel: { fontSize: 12, fontFamily: 'Inter-Regular' },
  statValue: { fontSize: 26, fontFamily: 'Inter-Bold', lineHeight: 32 },
  statSubGreen: { fontSize: 11, fontFamily: 'Inter-Medium', color: '#10B981' },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  viewAll: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },

  // Draft lead cards — horizontal scroll
  draftScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  draftCard: {
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  draftName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 20,
  },
  draftRef: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  draftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  draftBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  draftFooter: {
    alignItems: 'flex-end',
  },
  draftCta: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  quickCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },

  // Follow-up cards
  followList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  followCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  followIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  followNote: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 18,
  },
  followCompany: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  followRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  followDate: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  followTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
  },
  followPriority: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  followPriorityText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },

  // Empty state
  emptyCard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
