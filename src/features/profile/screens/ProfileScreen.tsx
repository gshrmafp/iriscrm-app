import React from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme, useThemeMode } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { logout } from '@/app/store/slices/authSlice';
import { clearTokens } from '@/services/storage/secureStorage';
import { ThemeMode } from '@/design-system/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#3B4ECC';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  REGIONAL_ADMIN: 'Regional Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales lead',
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

function MenuItem({ icon, label, subtitle, onPress, danger, right }: {
  icon: string;
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
        <AppText style={styles.menuItemIconText}>{icon}</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.menuItemLabel} color={danger ? '#DC2626' : theme.colors.text}>{label}</AppText>
        {subtitle && <AppText style={styles.menuItemSub} color={theme.colors.textMuted}>{subtitle}</AppText>}
      </View>
      {right ?? <AppText style={styles.chevron} color={theme.colors.textMuted}>›</AppText>}
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
  const insets = useSafeAreaInsets();

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

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
    : 'U';
  const displayName = user?.name ?? 'User';
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? 'Sales Rep';
  const avatarBg = avatarColor(displayName);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={[styles.pageHeader, { borderBottomColor: theme.colors.border }]}>
          <AppText style={styles.brandLabel}>IRIS CRM</AppText>
          <AppText style={styles.pageTitle} color={theme.colors.text}>Profile</AppText>
          <AppText style={styles.pageSubtitle} color={theme.colors.textMuted}>Account and preferences</AppText>
        </View>

        {/* User identity card */}
        <View style={[styles.identityCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.userAvatar, { backgroundColor: avatarBg }]}>
            <AppText style={styles.userAvatarText}>{initials}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.userName} color={theme.colors.text}>{displayName}</AppText>
            <AppText style={styles.userRole} color={theme.colors.textMuted}>
              {roleLabel} · IRIS workspace
            </AppText>
          </View>
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <AppText style={styles.menuItemIconText}>✎</AppText>
          </TouchableOpacity>
        </View>

        {/* Preferences section */}
        <SectionHeader title="Preferences" />
        <MenuCard>
          {/* Appearance with inline toggle */}
          <View style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.menuItemIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
              <AppText style={styles.menuItemIconText}>☀</AppText>
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
                    style={[styles.themeChip, { backgroundColor: active ? PRIMARY : theme.colors.surfaceAlt }]}
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
          <MenuItem icon="🔔" label="Notifications" subtitle="Activity reminders are on" />
          <MenuItem icon="🛡" label="Privacy & security" subtitle="Manage your workspace access" />
        </MenuCard>

        {/* Workspace section */}
        <SectionHeader title="Workspace" />
        <MenuCard>
          <MenuItem icon="❓" label="Help center" subtitle="Get support from the IRIS team" />
          <MenuItem
            icon="→"
            label="Sign out"
            subtitle="End this session"
            onPress={handleLogout}
            danger
            right={<AppText style={styles.chevron} color={theme.colors.textMuted}>›</AppText>}
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
  brandLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: PRIMARY, letterSpacing: 1.2, marginBottom: 2 },
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
  menuItemIconText: { fontSize: 18 },
  menuItemLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  menuItemSub: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 1 },
  chevron: { fontSize: 22 },

  themeToggle: { flexDirection: 'row', gap: 4 },
  themeChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  themeChipText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },

  version: { fontSize: 12, fontFamily: 'Inter-Regular', textAlign: 'center', marginTop: 4 },
});
