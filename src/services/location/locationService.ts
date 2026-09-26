import { Platform, Linking, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { LocationCoords } from './locationTypes';

Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  locationProvider: 'auto',
});

// watchPosition keeps the location subsystem open and resolves with whatever
// fix arrives first, rather than a single getCurrentPosition call's hard
// deadline — this succeeds much more often on providers that are slow to
// warm up. PERMISSION_DENIED fails fast; any other error is transient and
// the watch is left running until the overall timeout below.
export function getCurrentLocation(timeoutMs = 20000): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const watchId = Geolocation.watchPosition(
      pos => {
        if (settled) return;
        settled = true;
        Geolocation.clearWatch(watchId);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      err => {
        if (settled) return;
        if (err.code === 1) {
          settled = true;
          Geolocation.clearWatch(watchId);
          reject(err);
        }
        // else: transient — keep watching, the overall timeout below covers a full failure.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );
    setTimeout(() => {
      if (settled) return;
      settled = true;
      Geolocation.clearWatch(watchId);
      reject({ code: 2, message: 'Timed out waiting for location' });
    }, timeoutMs);
  });
}

export function promptEnableLocationServices(): void {
  Alert.alert(
    'Turn On Location',
    'Your device location (GPS) is turned off. Please enable it to continue.',
    Platform.OS === 'android'
      ? [
          {
            text: 'Open Location Settings',
            onPress: () => Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings()),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      : [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', style: 'cancel' },
        ],
  );
}
