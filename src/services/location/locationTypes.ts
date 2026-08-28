export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'checking';
