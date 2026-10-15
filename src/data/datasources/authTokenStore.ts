import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'siperapat.sanctum-token';
let memoryToken: string | null = null;
let unauthorizedHandler: (() => void) | undefined;

export const authTokenStore = {
  setUnauthorizedHandler(handler: () => void) { unauthorizedHandler = handler; },
  async handleUnauthorized(): Promise<void> {
    await this.clear();
    unauthorizedHandler?.();
  },
  async get(): Promise<string | null> {
    if (memoryToken) return memoryToken;
    if (Platform.OS === 'web') return null;
    try { memoryToken = await SecureStore.getItemAsync(TOKEN_KEY); return memoryToken; }
    catch { return null; }
  },
  async set(token: string, persist = true): Promise<void> {
    memoryToken = token;
    if (Platform.OS !== 'web') {
      if (persist) await SecureStore.setItemAsync(TOKEN_KEY, token);
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },
  async clear(): Promise<void> {
    memoryToken = null;
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  },
};
