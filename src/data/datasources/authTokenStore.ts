import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'siperapat_sanctum_token';

export const authTokenStore = {
  get: () => SecureStore.getItemAsync(AUTH_TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
};
