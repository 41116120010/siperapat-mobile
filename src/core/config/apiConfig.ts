const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = configuredBaseUrl?.replace(/\/+$/, '') ?? '';
export const API_TIMEOUT_MS = 15_000;

export function requireApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error(
      'Konfigurasi API belum tersedia. Atur EXPO_PUBLIC_API_BASE_URL lalu mulai ulang aplikasi.'
    );
  }

  return API_BASE_URL;
}
