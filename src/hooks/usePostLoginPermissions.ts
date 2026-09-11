import { useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotifications,
  request,
  PERMISSIONS,
  checkNotifications,
  check,
  RESULTS,
} from 'react-native-permissions';

const KEY = 'iris-permissions-requested';

async function requestAllPermissions() {
  const already = await AsyncStorage.getItem(KEY);
  if (already) return;

  await AsyncStorage.setItem(KEY, '1');

  const notifStatus = await checkNotifications();
  if (notifStatus.status === RESULTS.DENIED) {
    await requestNotifications(['alert', 'badge', 'sound']);
  }

  const locationPerm = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  })!;

  const locStatus = await check(locationPerm);
  if (locStatus === RESULTS.DENIED) {
    await request(locationPerm);
  }
}

export function usePostLoginPermissions() {
  useEffect(() => {
    const timer = setTimeout(requestAllPermissions, 800);
    return () => clearTimeout(timer);
  }, []);
}
