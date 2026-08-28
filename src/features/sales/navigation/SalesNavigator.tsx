import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, TouchableOpacity, Platform, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';
import { SalesStackParamList, SalesTabParamList } from './types';
import { DashboardScreen } from '@/features/sales/dashboard/screens/DashboardScreen';
import { LeadsScreen } from '@/features/sales/leads/screens/LeadsScreen';
import { LeadDetailScreen } from '@/features/sales/leads/screens/LeadDetailScreen';
import { LeadCreateScreen } from '@/features/sales/leads/screens/LeadCreateScreen';
import { CustomersScreen } from '@/features/sales/customers/screens/CustomersScreen';
import { CustomerDetailScreen } from '@/features/sales/customers/screens/CustomerDetailScreen';
import { CustomerCreateScreen } from '@/features/sales/customers/screens/CustomerCreateScreen';
import { ActivitiesScreen } from '@/features/sales/activities/screens/ActivitiesScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { OpportunityDetailScreen } from '@/features/sales/opportunities/screens/OpportunityDetailScreen';
import { NotificationsScreen } from '@/features/sales/notifications/screens/NotificationsScreen';

const Tab = createBottomTabNavigator<SalesTabParamList>();
const Stack = createNativeStackNavigator<SalesStackParamList>();

type TabItem = { name: keyof SalesTabParamList; label: string; icon: string };

const TABS: TabItem[] = [
  { name: 'Home',       label: 'Home',       icon: '⌂' },
  { name: 'Leads',      label: 'Leads',      icon: '⚇' },
  { name: 'Activities', label: 'Activities', icon: '✓' },
  { name: 'Customers',  label: 'Customers',  icon: '⊞' },
  { name: 'Profile',    label: 'Profile',    icon: '◯' },
];

// Crisp icon set matching the screenshot's outlined icons
const TAB_ICONS: Record<keyof SalesTabParamList, { active: string; inactive: string }> = {
  Home:       { active: 'H', inactive: 'H' },
  Leads:      { active: 'L', inactive: 'L' },
  Activities: { active: 'A', inactive: 'A' },
  Customers:  { active: 'C', inactive: 'C' },
  Profile:    { active: 'P', inactive: 'P' },
};

// SVG-like unicode chars for each tab
const ICON_CHARS: Record<keyof SalesTabParamList, string> = {
  Home:       '⌂',
  Leads:      '◉',
  Activities: '☑',
  Customers:  '▣',
  Profile:    '⊙',
};

function SalesTabBar({ state, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const PRIMARY = '#3B4ECC';

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          ...theme.shadows.md,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const tab = TABS[index];
        const iconChar = ICON_CHARS[route.name as keyof SalesTabParamList] ?? '●';

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.75}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tabItem}
          >
            <View
              style={[
                styles.iconWrap,
                focused && {
                  backgroundColor: PRIMARY,
                  borderRadius: 12,
                },
              ]}
            >
              <AppText
                style={{
                  ...styles.icon,
                  color: focused ? '#FFFFFF' : theme.colors.textMuted,
                } as TextStyle}
              >
                {iconChar}
              </AppText>
            </View>
            <AppText
              style={{
                ...styles.tabLabel,
                color: focused ? PRIMARY : theme.colors.textMuted,
              } as TextStyle}
            >
              {tab?.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SalesTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <SalesTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"       component={DashboardScreen} />
      <Tab.Screen name="Leads"      component={LeadsScreen} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen name="Customers"  component={CustomersScreen} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function SalesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="SalesTabs"        component={SalesTabNavigator} />
      <Stack.Screen name="LeadCreate"       component={LeadCreateScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="LeadDetail"       component={LeadDetailScreen} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} />
      <Stack.Screen name="CustomerDetail"   component={CustomerDetailScreen} />
      <Stack.Screen name="CustomerCreate"   component={CustomerCreateScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    lineHeight: 13,
  },
});
