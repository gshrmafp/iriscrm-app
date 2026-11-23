import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HrmsStackParamList } from './types';
import { MyHrProfileScreen } from '@/features/hrms/screens/MyHrProfileScreen';
import { EditHrContactScreen } from '@/features/hrms/screens/EditHrContactScreen';

const Stack = createNativeStackNavigator<HrmsStackParamList>();

// "My Workspace" — employee self-service. Attendance, leave and approvals
// tabs join this navigator in later milestones.
export function HrmsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyHrProfile" component={MyHrProfileScreen} />
      <Stack.Screen name="EditHrContact" component={EditHrContactScreen} />
    </Stack.Navigator>
  );
}
