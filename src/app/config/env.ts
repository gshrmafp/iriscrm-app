import { NativeModules, Platform } from 'react-native';

// iOS simulator connects to 127.0.0.1 (NSAllowsLocalNetworking covers this).
//
// Android has two cases and no single hardcoded IP covers both:
// - Emulator: reaches the host machine via the fixed alias 10.0.2.2.
// - Real device: has no route to 10.0.2.2; needs `adb reverse tcp:3000
//   tcp:3000` and must use localhost instead.
//
// RN's own tooling already resolves this ambiguity for the Metro bundler
// connection (scriptURL is 10.0.2.2 on the emulator, localhost on a real
// device via the auto-configured `adb reverse tcp:8081`), so we reuse that
// same host for the API instead of guessing again.
const getAndroidDevHost = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  const host = scriptURL ? scriptURL.split('://')[1]?.split(':')[0] : null;
  return host || '10.0.2.2';
};

const DEV_API_HOST =
  Platform.OS === 'ios'
    ? 'http://localhost:3000'
    : `http://${getAndroidDevHost()}:3000`;

export const API_BASE_URL = __DEV__
  ? `${DEV_API_HOST}/api/v1`
  : 'https://api.yourdomain.com/api/v1';
