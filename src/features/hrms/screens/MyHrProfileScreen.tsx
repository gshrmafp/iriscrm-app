import React from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Menu, Edit3, Hash, Briefcase, Building2, MapPin, UserRound, CalendarDays, Phone, Mail, Home, HeartPulse,
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import {
  hrmsApi, Employee, EmployeeLifecycleStatus, LIFECYCLE_LABELS, EMPLOYMENT_TYPE_LABELS, formatHrDate,
} from '@/services/api/hrms.api';
import { HrmsStackParamList } from '@/features/hrms/navigation/types';

type Nav = NativeStackNavigationProp<HrmsStackParamList>;

export const MY_EMPLOYEE_QUERY_KEY = ['hrms', 'employees', 'me'] as const;

type Row = { Icon: React.ComponentType<any>; label: string; value?: string | null };

function statusColors(status: EmployeeLifecycleStatus, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case 'CONFIRMED': return { bg: theme.colors.successLight, fg: theme.colors.success };
    case 'NOTICE': return { bg: theme.colors.warningLight, fg: theme.colors.warning };
    case 'EXITED': return { bg: theme.colors.surfaceAlt, fg: theme.colors.textMuted };
    default: return { bg: theme.colors.primaryLight, fg: theme.colors.primary };
  }
}

function DetailCard({ title, rows }: { title: string; rows: Row[] }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle} color={theme.colors.textMuted}>{title.toUpperCase()}</AppText>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.row,
              i < rows.length - 1 ? { borderBottomColor: theme.colors.border } : { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
              <row.Icon size={16} color={theme.colors.textSecondary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.rowLabel} color={theme.colors.textMuted}>{row.label}</AppText>
              <AppText style={styles.rowValue} color={row.value ? theme.colors.text : theme.colors.textMuted}>
                {row.value || '—'}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function employmentRows(e: Employee): Row[] {
  return [
    { Icon: Hash, label: 'Employee code', value: e.userId },
    { Icon: Briefcase, label: 'Designation', value: e.designation?.name },
    { Icon: Building2, label: 'Department', value: e.department?.name },
    { Icon: MapPin, label: 'Branch', value: e.user.region?.name ?? e.user.regionId },
    { Icon: UserRound, label: 'Reports to', value: e.user.reportingTo?.name },
    { Icon: Briefcase, label: 'Employment type', value: EMPLOYMENT_TYPE_LABELS[e.employmentType] },
    { Icon: CalendarDays, label: 'Joining date', value: e.joiningDate ? formatHrDate(e.joiningDate) : null },
    ...(e.probationEndsOn ? [{ Icon: CalendarDays, label: 'Probation ends', value: formatHrDate(e.probationEndsOn) }] : []),
  ];
}

function contactRows(e: Employee): Row[] {
  const emergency = e.emergencyContactName
    ? `${e.emergencyContactName}${e.emergencyContactRel ? ` (${e.emergencyContactRel})` : ''}${e.emergencyContactPhone ? ` · ${e.emergencyContactPhone}` : ''}`
    : null;
  return [
    { Icon: Mail, label: 'Work email', value: e.user.email },
    { Icon: Phone, label: 'Phone', value: e.phone },
    { Icon: Mail, label: 'Personal email', value: e.personalEmail },
    { Icon: Home, label: 'Current address', value: e.currentAddress },
    { Icon: Home, label: 'Permanent address', value: e.permanentAddress },
    { Icon: HeartPulse, label: 'Emergency contact', value: emergency },
  ];
}

export function MyHrProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { data: employee, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: MY_EMPLOYEE_QUERY_KEY,
    queryFn: () => hrmsApi.getMyEmployee().then(r => r.data),
    staleTime: 60_000,
  });

  const initials = (employee?.user.name ?? 'U').split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  const status = employee ? statusColors(employee.lifecycleStatus, theme) : null;

  return (
    <Screen edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.headerBtn}
          activeOpacity={0.7}
          accessibilityLabel="Open menu"
        >
          <Menu size={22} color={theme.colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerTitle} color={theme.colors.text}>My Workspace</AppText>
          <AppText style={styles.headerSub} color={theme.colors.textMuted}>Employee profile</AppText>
        </View>
        {employee ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditHrContact')}
            style={[styles.headerBtn, styles.editBtn, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
            activeOpacity={0.75}
            accessibilityLabel="Edit contact details"
          >
            <Edit3 size={16} color={theme.colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : isError || !employee ? (
        <View style={styles.center}>
          <AppText style={styles.emptyText} color={theme.colors.textMuted}>
            Couldn't load your employee record. Pull down to retry, or contact HR if this keeps happening.
          </AppText>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}>
            <AppText style={styles.retryText} color="#FFF">Retry</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={theme.colors.primary} />}
        >
          <View style={[styles.identity, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <AppText style={styles.avatarText}>{initials}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.name} color={theme.colors.text}>{employee.user.name}</AppText>
              <AppText style={styles.subtitle} color={theme.colors.textMuted}>
                {[employee.designation?.name, employee.department?.name].filter(Boolean).join(' · ') || employee.userId}
              </AppText>
              {status ? (
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <AppText style={styles.statusText} color={status.fg}>{LIFECYCLE_LABELS[employee.lifecycleStatus]}</AppText>
                </View>
              ) : null}
            </View>
          </View>

          <DetailCard title="Employment" rows={employmentRows(employee)} />
          <DetailCard title="Contact" rows={contactRows(employee)} />
          <AppText style={styles.hint} color={theme.colors.textMuted}>
            Employment details are managed by HR. Tap the pencil to update your contact details.
          </AppText>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  editBtn: { borderRadius: 10, borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter-Regular' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFF' },
  name: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statusText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter-SemiBold', letterSpacing: 1.1, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 11, fontFamily: 'Inter-Medium' },
  rowValue: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 1 },
  hint: { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 12, marginLeft: 4 },
});
