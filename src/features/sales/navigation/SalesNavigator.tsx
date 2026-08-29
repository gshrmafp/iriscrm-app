import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, CheckSquare, Building2, UserCircle } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
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

const TAB_DEFS: { name: keyof SalesTabParamList; label: string; Icon: React.ComponentType<any> }[] = [
  { name: 'Home',       label: 'Home',       Icon: Home },
  { name: 'Leads',      label: 'Leads',      Icon: Users },
  { name: 'Activities', label: 'Activities', Icon: CheckSquare },
  { name: 'Customers',  label: 'Customers',  Icon: Building2 },
  { name: 'Profile',    label: 'Profile',    Icon: UserCircle },
];

function TabItem({ focused, tab, onPress }: { focused: boolean; tab: typeof TAB_DEFS[0]; onPress: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.82, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.tabItem}>
      <Animated.View style={[styles.iconWrap, animatedStyle, focused && { backgroundColor: theme.colors.primary, borderRadius: 12 }]}>
        <tab.Icon
          size={20}
          color={focused ? '#FFFFFF' : theme.colors.textMuted}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </Animated.View>
      <AppText style={[styles.tabLabel, { color: focused ? theme.colors.primary : theme.colors.textMuted }]}>
        {tab.label}
      </AppText>
    </TouchableOpacity>
  );
}

function SalesTabBar({ state, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          // Some Android devices (e.g. 3-button nav) report a 0 safe-area
          // inset even though the nav bar is on-screen, so the fallback
          // needs real breathing room of its own, not just a thin sliver.
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          ...theme.shadows.md,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const tab = TAB_DEFS[index];
        if (!tab) return null;

        return (
          <TabItem
            key={route.key}
            focused={focused}
            tab={tab}
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
          />
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
        animationDuration: 200,
        animationTypeForReplace: 'push',
      }}
    >
      <Stack.Screen name="SalesTabs"         component={SalesTabNavigator} />
      <Stack.Screen name="LeadCreate"        component={LeadCreateScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="LeadDetail"        component={LeadDetailScreen} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} />
      <Stack.Screen name="CustomerDetail"    component={CustomerDetailScreen} />
      <Stack.Screen name="CustomerCreate"    component={CustomerCreateScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="Notifications"     component={NotificationsScreen} />
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
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    lineHeight: 13,
  },
});
