import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';
import { AppDrawerParamList } from './types';
import { SalesNavigator } from '@/features/sales/navigation/SalesNavigator';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { logout } from '@/app/store/slices/authSlice';
import { clearTokens } from '@/services/storage/secureStorage';

const Drawer = createDrawerNavigator<AppDrawerParamList>();

const MENU_ITEMS = [
  { name: 'SalesStack' as const, label: 'Sales Dashboard', icon: '◎' },
  { name: 'ProfileScreen' as const, label: 'Profile & Settings', icon: '◉' },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const nav = useNavigation();

  const handleLogout = async () => {
    await clearTokens();
    dispatch(logout('user'));
  };

  return (
    <View style={[styles.drawer, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={[styles.drawerHeader, { backgroundColor: theme.colors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: theme.radii.full }]}>
          <AppText variant="h2" color="#FFFFFF">{user?.name?.[0] ?? 'U'}</AppText>
        </View>
        <AppText variant="label" color="#FFFFFF">{user?.name ?? 'User'}</AppText>
        <AppText variant="caption" color="rgba(255,255,255,0.8)">{user?.role ?? 'Sales Rep'}</AppText>
      </View>

      <ScrollView style={styles.menuList}>
        {MENU_ITEMS.map(item => {
          const focused = props.state.routes[props.state.index]?.name === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => {
                props.navigation.navigate(item.name);
              }}
              style={[
                styles.menuItem,
                focused && { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <AppText variant="h3" style={{ fontSize: 18 }} color={focused ? theme.colors.primary : theme.colors.textSecondary}>
                {item.icon}
              </AppText>
              <AppText variant="label" color={focused ? theme.colors.primary : theme.colors.text}>
                {item.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.drawerFooter, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleLogout} style={styles.menuItem}>
          <AppText variant="h3" style={{ fontSize: 18 }} color={theme.colors.error}>✕</AppText>
          <AppText variant="label" color={theme.colors.error}>Sign Out</AppText>
        </TouchableOpacity>
        <AppText variant="caption" color={theme.colors.textMuted} align="center" style={{ marginBottom: 8 }}>
          IRIS CRM v1.0.0
        </AppText>
      </View>
    </View>
  );
}

export function AppDrawerNavigator() {
  const theme = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: '75%' },
        overlayColor: 'rgba(0,0,0,0.4)',
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
  drawerHeader: { paddingTop: 48, paddingBottom: 24, paddingHorizontal: 20, gap: 4 },
  avatar: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  menuList: { flex: 1, paddingTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginHorizontal: 8, marginBottom: 4 },
  drawerFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
});
