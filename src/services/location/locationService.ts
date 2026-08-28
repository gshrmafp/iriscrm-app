import Geolocation from 'react-native-geolocation-service';
import { LocationCoords } from './locationTypes';

export function getCurrentLocation(timeoutMs = 10000): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}
