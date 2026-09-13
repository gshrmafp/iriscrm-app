import { Platform, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { LocationPermissionStatus } from './locationTypes';

const LOCATION_PERMISSION = Platform.select({
  ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
})!;

export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  const result = await check(LOCATION_PERMISSION);
  console.log(`[LOCATION] checkPermission: raw=${result}`);
  switch (result) {
    case RESULTS.GRANTED: return 'granted';
    case RESULTS.DENIED: return 'denied';
    case RESULTS.BLOCKED: return 'blocked';
    default: return 'unavailable';
  }
}

export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  console.log('[LOCATION] requestPermission called');
  const result = await request(LOCATION_PERMISSION);
  console.log(`[LOCATION] requestPermission: raw=${result}`);
  switch (result) {
    case RESULTS.GRANTED: return 'granted';
    case RESULTS.DENIED: return 'denied';
    case RESULTS.BLOCKED: return 'blocked';
    default: return 'unavailable';
  }
}

export function openLocationSettings(): void {
  Linking.openSettings();
}
