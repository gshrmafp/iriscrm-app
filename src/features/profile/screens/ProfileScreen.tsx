import React from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTheme, useThemeMode } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { logout } from '@/app/store/slices/authSlice';
import { clearTokens } from '@/services/storage/secureStorage';
import { authApi } from '@/services/api/auth.api';
import { ThemeMode } from '@/design-system/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sun, Bell, Shield, HelpCircle, LogOut, Edit3, Lock,
  ChevronRight, Mail, Briefcase, MapPin, Hash, Calendar, Clock,
} from 'lucide-react-native';
import { SalesStackParamList } from '@/features/sales/navigation/types';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  REGIONAL_ADMIN: 'Regional Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Executive',
  AUDITOR: 'Auditor',
};

const AVATAR_COLORS = ['#3B4ECC', '#7C3AED', '#059669', '#B45309', '#DC2626', '#0891B2'];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <AppText style={styles.sectionHeader} color={theme.colors.text}>{title}</AppText>
  );
}

function MenuItem({ Icon, label, subtitle, onPress, danger, right }: {
  Icon: React.ComponentType<any>;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.menuItemIcon, { backgroundColor: danger ? '#FEE2E2' : theme.colors.surfaceAlt }]}>
        <Icon size={18} color={danger ? '#DC2626' : theme.colors.textSecondary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.menuItemLabel} color={danger ? '#DC2626' : theme.colors.text}>{label}</AppText>
        {subtitle && <AppText style={styles.menuItemSub} color={theme.colors.textMuted}>{subtitle}</AppText>}
      </View>
      {right ?? (
        <ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
}

function MenuCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.menuCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {children}
    </View>
  );
}

export function ProfileScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const user = useAppSelector(s => s.auth.user);
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => authApi.getMe().then(r => r.data),
    staleTime: 60_000,
  });

  const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          dispatch(logout('user'));
        },
      },
    ]);
  };

  const displayName = profile?.name ?? user?.name ?? 'User';
  const displayEmail = profile?.email ?? user?.email ?? '';
  const initials = displayName.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || 'U';
  const roleLabel = ROLE_LABELS[profile?.role ?? user?.role ?? ''] ?? user?.role ?? 'Sales Rep';
  const avatarBg = avatarColor(displayName);
  const employeeId = profile?.id ?? user?.id ?? '';
  const regionDisplay = profile?.region
    ? `${profile.region.code} — ${profile.region.name}`
    : (profile?.regionId ?? user?.regionId ?? '—');

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const createdAt = formatDate(profile?.createdAt);
  const updatedAt = formatDate(profile?.updatedAt);

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={[styles.pageHeader, { borderBottomColor: theme.colors.border }]}>
          <AppText style={styles.brandLabel} color={theme.colors.primary}>IRIS CRM</AppText>
          <AppText style={styles.pageTitle} color={theme.colors.text}>Profile</AppText>
          <AppText style={styles.pageSubtitle} color={theme.colors.textMuted}>Account and preferences</AppText>
        </View>

        {/* User identity card — tappable to edit */}
        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.75}
          style={[styles.identityCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={[styles.userAvatar, { backgroundColor: avatarBg }]}>
            <AppText style={styles.userAvatarText}>{initials}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.userName} color={theme.colors.text}>{displayName}</AppText>
            <AppText style={styles.userRole} color={theme.colors.textMuted}>
              {roleLabel}
            </AppText>
          </View>
          <View style={[styles.editBtn, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <Edit3 size={16} color={theme.colors.textSecondary} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Account details */}
        <SectionHeader title="Account" />
        <MenuCard>
          {([
            { Icon: Hash, label: 'Employee ID', value: employeeId },
            { Icon: Mail, label: 'Email', value: displayEmail },
            { Icon: Briefcase, label: 'Role', value: roleLabel },
            { Icon: MapPin, label: 'Region', value: regionDisplay },
            { Icon: Calendar, label: 'Date Created', value: createdAt },
            { Icon: Clock, label: 'Last Updated', value: updatedAt },
          ] as const).map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.detailRow, i < arr.length - 1 ? { borderBottomColor: theme.colors.border } : { borderBottomWidth: 0 }]}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <row.Icon size={16} color={theme.colors.textSecondary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.detailLabel} color={theme.colors.textMuted}>{row.label}</AppText>
                <AppText style={styles.detailValue} color={theme.colors.text}>{row.value || '—'}</AppText>
              </View>
            </View>
          ))}
        </MenuCard>

        {/* Preferences section */}
        <SectionHeader title="Preferences" />
        <MenuCard>
          {/* Appearance with inline toggle */}
          <View style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.menuItemIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Sun size={18} color={theme.colors.textSecondary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.menuItemLabel} color={theme.colors.text}>Appearance</AppText>
              <AppText style={styles.menuItemSub} color={theme.colors.textMuted}>Choose how IRIS looks</AppText>
            </View>
            <View style={styles.themeToggle}>
              {THEME_MODES.map(mode => {
                const active = themeMode === mode;
                const label = mode.charAt(0).toUpperCase() + mode.slice(1);
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setThemeMode(mode)}
                    style={[styles.themeChip, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt }]}
                  >
                    <AppText
                      style={styles.themeChipText}
                      color={active ? '#FFF' : theme.colors.textSecondary}
                    >
                      {label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <MenuItem
            Icon={Bell}
            label="Notifications"
            subtitle="Manage push notification preferences"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </MenuCard>

        {/* Security section */}
        <SectionHeader title="Security" />
        <MenuCard>
          <MenuItem
            Icon={Lock}
            label="Change password"
            subtitle="Update your account password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuItem
            Icon={Shield}
            label="Privacy & security"
            subtitle="Manage your workspace access"
            onPress={() => navigation.navigate('PrivacySecurity')}
          />
        </MenuCard>

        {/* Workspace section */}
        <SectionHeader title="Workspace" />
        <MenuCard>
          <MenuItem
            Icon={HelpCircle}
            label="Help center"
            subtitle="Get support from the IRIS team"
            onPress={() => {
              Alert.alert('Help Center', 'For support, contact your workspace administrator or email support@iris.local');
            }}
          />
          <MenuItem
            Icon={LogOut}
            label="Sign out"
            subtitle="End this session"
            onPress={handleLogout}
            danger
            right={<ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2} />}
          />
        </MenuCard>

        <AppText style={styles.version} color={theme.colors.textMuted}>IRIS CRM · v1.0.0</AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  pageHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', letterSpacing: 1.2, marginBottom: 2 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter-Bold', lineHeight: 34 },
  pageSubtitle: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  userAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatarText: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFF' },
  userName: { fontSize: 18, fontFamily: 'Inter-SemiBold', lineHeight: 22 },
  userRole: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { fontSize: 17, fontFamily: 'Inter-SemiBold', paddingHorizontal: 16, marginBottom: 10, marginTop: 6 },

  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuItemLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  menuItemSub: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 1 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 11, fontFamily: 'Inter-Medium', letterSpacing: 0.3 },
  detailValue: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 1 },

  themeToggle: { flexDirection: 'row', gap: 4 },
  themeChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  themeChipText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },

  version: { fontSize: 12, fontFamily: 'Inter-Regular', textAlign: 'center', marginTop: 4 },
});
