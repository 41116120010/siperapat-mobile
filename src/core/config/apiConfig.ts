const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export function requireApiBaseUrl(): string {
  if (!RAW_API_BASE_URL) throw new Error('EXPO_PUBLIC_API_BASE_URL belum dikonfigurasi.');
  return RAW_API_BASE_URL.replace(/\/+$/, '');
}

export const API_TIMEOUT_MS = 20_000;
