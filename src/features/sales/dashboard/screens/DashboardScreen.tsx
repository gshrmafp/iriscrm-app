import React from 'react';
import {
  ScrollView, View, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, PenLine, Search, TrendingUp, Users, Clock, Building2, Phone, Mail, CalendarCheck } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { NotificationBell } from '@/components/common/NotificationBell';
import { useAppSelector } from '@/app/store/hooks';
import { dashboardApi } from '@/services/api/dashboard.api';
import { leadsApi, FollowUp } from '@/services/api/leads.api';
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
    queryFn: () => leadsApi.followUpsFeed({ page: 1, pageSize: 5 }).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: customerSummary, isFetching: cs, refetch: r4 } = useQuery({
    queryKey: ['customers-summary', refreshKey],
    queryFn: () => customersApi.summary().then(r => r.data),
    staleTime: 60_000,
  });

  const refreshing = ls || of_ || ff || cs;
  const onRefresh = () => {
    setRefreshKey(k => k + 1);
    r1(); r2(); r3(); r4();
  };

  const totalLeads = leadSummary?.activeCount ?? 0;
  const needsAttention = leadSummary?.needAttentionCount ?? 0;
  const totalFollowUps = followUpsData?.total ?? 0;
  const totalCustomers = customerSummary?.total ?? 0;
  const newCustomersThisMonth = customerSummary?.newThisMonth ?? 0;
  const pipelineValue = oppData?.pipelineValue;
  const todayItems = followUpsData?.items ?? [];
  const dueTodayCount = todayItems.filter(item => isDueToday(item.nextActionAt)).length;

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
          {/* Primary dark card — open pipeline */}
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

          {/* Active leads */}
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

          {/* Follow-ups */}
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconLight, { backgroundColor: theme.colors.primaryLight }]}>
                <Clock size={16} color={theme.colors.primary} strokeWidth={2} />
              </View>
            </View>
            <AppText style={styles.statLabel} color={theme.colors.textMuted}>Follow-ups</AppText>
            <AppText style={styles.statValue} color={theme.colors.text}>{totalFollowUps}</AppText>
            <AppText style={styles.statSubGreen}>{dueTodayCount > 0 ? `${dueTodayCount} due today` : totalFollowUps > 0 ? 'None due today' : 'All clear'}</AppText>
          </View>

          {/* Customers */}
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

        {/* Today's priorities */}
        {todayItems.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <AppText style={styles.sectionTitle} color={theme.colors.text}>{"Today's priorities"}</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('SalesTabs', { screen: 'Activities' })}>
                <AppText style={[styles.viewAll, { color: theme.colors.primary }]}>View all</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.priorityList}>
              {todayItems.map((item: FollowUp) => {
                const priority = item.priority ?? 'MEDIUM';
                const priorityKey = priority.toLowerCase();
                const timeStr = item.nextActionAt ? formatFollowUpTime(item.nextActionAt) : isOverdue(item.nextActionAt) ? 'Overdue' : 'No due date';
                const ChannelIcon = CHANNEL_ICON[item.channel] ?? CalendarCheck;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.priorityCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    activeOpacity={0.75}
                    onPress={() => item.lead && navigation.navigate('LeadDetail', { id: item.lead.id })}
                  >
                    <View style={[styles.priorityCheck, { borderColor: theme.colors.border }]} />
                    <View style={[styles.priorityIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                      <ChannelIcon size={14} color={theme.colors.primary} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.priorityTitle} color={theme.colors.text} numberOfLines={1}>
                        {item.note}
                      </AppText>
                      {item.lead && (
                        <AppText style={styles.priorityCompany} color={theme.colors.textMuted} numberOfLines={1}>
                          {item.lead.companyName ?? item.lead.contactName}
                        </AppText>
                      )}
                      <AppText style={styles.priorityTime} color={theme.colors.textMuted}>{timeStr}</AppText>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_BG[priorityKey] ?? PRIORITY_BG.medium }]}>
                      <AppText style={styles.priorityBadgeText} color={PRIORITY_COLORS[priorityKey] ?? PRIORITY_COLORS.medium}>
                        {priorityKey.charAt(0).toUpperCase() + priorityKey.slice(1)}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
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
  statCardDark: {
    borderWidth: 0,
  },
  statIconRow: {
    marginBottom: 6,
  },
  statIconDark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconLight: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabelDark: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.65)',
  },
  statValueDark: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  statSubDark: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6EE7B7',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statValue: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    lineHeight: 32,
  },
  statSubGreen: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  viewAll: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },

  priorityList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  priorityCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  priorityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 18,
  },
  priorityCompany: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  priorityTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
});
