import { useCallback, useRef, useState } from 'react';
import { checkLocationPermission, getCurrentLocation } from '@/services/location';
import { apiClient } from '@/services/api/client';

export interface SilentLocation {
  gpsLatitude?: number;
  gpsLongitude?: number;
  visitLocation?: string;
}

// Silently captures GPS + a reverse-geocoded address label for flows where
// location must never interrupt the user — logging a Meeting, capturing a
// Purchase Order on Win. Location permission is already granted post-login
// (see usePostLoginPermissions), so this never requests permission and never
// shows a prompt: it just best-efforts a location and leaves the fields
// undefined if permission isn't granted or the GPS fix fails. No UI of its
// own — call `capture()` (e.g. when a modal opens) and read `location` at
// submit time.
export function useSilentLocationCapture() {
  const [location, setLocation] = useState<SilentLocation>({});
  const capturing = useRef(false);

  const capture = useCallback(async () => {
    if (capturing.current) return;
    capturing.current = true;
    try {
      const status = await checkLocationPermission();
      if (status !== 'granted') return;

      const coords = await getCurrentLocation(10000);
      setLocation({ gpsLatitude: coords.latitude, gpsLongitude: coords.longitude });

      try {
        const res = await apiClient.get('/geo/reverse-geocode', {
          params: { lat: coords.latitude, lng: coords.longitude },
        });
        const address = (res.data as any)?.address;
        if (address) setLocation(prev => ({ ...prev, visitLocation: address }));
      } catch {
        // Best-effort reverse geocode — leave visitLocation undefined.
      }
    } catch {
      // Best-effort GPS fix — leave gps fields undefined, never surface an error.
    } finally {
      capturing.current = false;
    }
  }, []);

  const reset = useCallback(() => setLocation({}), []);

  return { location, capture, reset };
}
