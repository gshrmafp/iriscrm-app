import { Platform, Linking, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { LocationCoords } from './locationTypes';

Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  locationProvider: 'auto',
});

function getPosition(highAccuracy: boolean, timeoutMs: number): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      err => reject(err),
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 60000,
      },
    );
  });
}

export async function getCurrentLocation(timeoutMs = 15000): Promise<LocationCoords> {
  try {
    return await getPosition(true, timeoutMs);
  } catch (firstErr: any) {
    if (firstErr?.code === 1) throw firstErr;
    return await getPosition(false, 20000);
  }
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
