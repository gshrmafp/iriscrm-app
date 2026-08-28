import Keychain from 'react-native-keychain';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const SERVICE = 'iris-auth';

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), { service: SERVICE });
}

export async function getTokens(): Promise<AuthTokens | null> {
  const result = await Keychain.getGenericPassword({ service: SERVICE });
  if (!result) return null;
  return JSON.parse(result.password);
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
