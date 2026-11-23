const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export function requireApiBaseUrl(): string {
  if (!RAW_API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL belum dikonfigurasi.');
  }

  let parsed: URL;
  try {
    parsed = new URL(RAW_API_BASE_URL);
  } catch {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL tidak valid. Gunakan URL lengkap (contoh: https://domain/api/v1).',
    );
  }

  const isDevRuntime = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDevRuntime && parsed.protocol !== 'https:') {
    throw new Error(
      'Build produksi wajib menggunakan HTTPS untuk EXPO_PUBLIC_API_BASE_URL.',
    );
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Protokol EXPO_PUBLIC_API_BASE_URL tidak didukung.');
  }

  return RAW_API_BASE_URL.replace(/\/+$/, '');
}

export const API_TIMEOUT_MS = 20_000;
export const UPLOAD_TIMEOUT_MS = 60_000;
export const DOWNLOAD_TIMEOUT_MS = 30_000;
