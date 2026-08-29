import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';
import { AppDrawerParamList } from './types';
import { SalesNavigator } from '@/features/sales/navigation/SalesNavigator';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { logout } from '@/app/store/slices/authSlice';
import { clearTokens } from '@/services/storage/secureStorage';
import { DARK_NAVY } from '@/constants/brandColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Drawer = createDrawerNavigator<AppDrawerParamList>();

type DrawerNavItem = {
  name: keyof AppDrawerParamList | 'logout';
  label: string;
  subtitle?: string;
  Icon: React.ComponentType<any>;
  danger?: boolean;
};

type DrawerSection = { title?: string; items: DrawerNavItem[] };

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    items: [
      {
        name: 'SalesStack',
        label: 'Sales',
        subtitle: 'Leads, pipeline & customers',
        Icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        name: 'ProfileScreen',
        label: 'Profile & Settings',
        subtitle: 'Preferences and account info',
        Icon: Settings,
      },
    ],
  },
  {
    title: 'Session',
    items: [
      {
        name: 'logout',
        label: 'Sign Out',
        subtitle: 'End this session',
        Icon: LogOut,
        danger: true,
      },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  REGIONAL_ADMIN: 'Regional Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Executive',
};

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
    : 'U';
  const displayName = user?.name ?? 'User';
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? 'Sales Rep';

  const handleLogout = async () => {
    await clearTokens();
    dispatch(logout('user'));
  };

  const handleItemPress = (item: DrawerNavItem) => {
    if (item.name === 'logout') {
      handleLogout();
      return;
    }
    props.navigation.navigate(item.name as keyof AppDrawerParamList);
  };

  const currentRouteName = props.state.routes[props.state.index]?.name;

  return (
    <View style={[styles.drawer, { backgroundColor: theme.colors.surface }]}>
      {/* Identity header */}
      <View style={[styles.drawerHeader, { backgroundColor: DARK_NAVY, paddingTop: insets.top + 16 }]}>
        <View style={styles.avatarWrap}>
          <AppText style={styles.avatarText}>{initials}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.drawerName}>{displayName}</AppText>
          <AppText style={styles.drawerRole}>{roleLabel} · IRIS workspace</AppText>
        </View>
      </View>

      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {DRAWER_SECTIONS.map((section, si) => (
          <View key={si} style={styles.section}>
            {section.title ? (
              <AppText style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
                {section.title.toUpperCase()}
              </AppText>
            ) : null}
            {section.items.map(item => {
              const focused = !item.danger && currentRouteName === item.name;
              const iconColor = item.danger
                ? theme.colors.error
                : focused
                ? theme.colors.primary
                : theme.colors.textSecondary;
              return (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.75}
                  style={[
                    styles.menuItem,
                    focused && { backgroundColor: theme.colors.primaryLight },
                    { borderRadius: theme.radii.md },
                  ]}
                >
                  <View
                    style={[
                      styles.menuIconWrap,
                      {
                        backgroundColor: item.danger
                          ? '#FEE2E2'
                          : focused
                          ? theme.colors.primary
                          : theme.colors.surfaceAlt,
                      },
                    ]}
                  >
                    <item.Icon
                      size={18}
                      color={focused ? '#FFF' : iconColor}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={styles.menuItemLabel}
                      color={item.danger ? theme.colors.error : focused ? theme.colors.primary : theme.colors.text}
                    >
                      {item.label}
                    </AppText>
                    {item.subtitle ? (
                      <AppText style={styles.menuItemSub} color={theme.colors.textMuted}>
                        {item.subtitle}
                      </AppText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.drawerFooter, { borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 4 }]}>
        <AppText style={styles.version} color={theme.colors.textMuted}>IRIS CRM · v1.0.0</AppText>
      </View>
    </View>
  );
}

export function AppDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: '78%' },
        overlayColor: 'rgba(0,0,0,0.45)',
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="SalesStack" component={SalesNavigator} />
      <Drawer.Screen name="ProfileScreen" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1 },

  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFF' },
  drawerName: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFF', lineHeight: 21 },
  drawerRole: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  menuList: { flex: 1, paddingTop: 8 },
  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.1,
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 10,
    marginBottom: 2,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuItemLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  menuItemSub: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 1 },

  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  version: { fontSize: 12, fontFamily: 'Inter-Regular', textAlign: 'center' },
});
