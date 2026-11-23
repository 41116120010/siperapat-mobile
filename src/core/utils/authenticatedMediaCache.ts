import * as FileSystem from 'expo-file-system/legacy';
import { DOWNLOAD_TIMEOUT_MS, requireApiBaseUrl } from '../config/apiConfig';
import { authTokenStore } from '../../data/datasources/authTokenStore';

export interface AuthMediaCacheOptions {
  cachePrefix: string;
  cacheKey: string;
  ext?: 'jpg' | 'png' | 'webp';
}

const MEDIA_CACHE_PREFIXES = [
  'hist_',
  'evidence_',
  'mon_',
  'selfie_detail_',
  'rep_detail_',
  'edaran_',
  'authmedia_',
  'SIPERAPAT_',
  'tmp_export_',
];

export async function downloadFileWithTimeout(
  url: string,
  destUri: string,
  headers: Record<string, string>,
  timeoutMs = DOWNLOAD_TIMEOUT_MS,
): Promise<FileSystem.FileSystemDownloadResult> {
  const resumable = FileSystem.createDownloadResumable(url, destUri, { headers });
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        void resumable.cancelAsync().catch(() => {});
        reject(new Error('Unduhan berkas dari server melewati batas waktu.'));
      }, timeoutMs);
    });

    const result = await Promise.race([resumable.downloadAsync(), timeoutPromise]);
    if (!result) {
      throw new Error(
        timedOut
          ? 'Unduhan berkas dari server melewati batas waktu.'
          : 'Unduhan berkas dibatalkan atau gagal.',
      );
    }
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const inFlightDownloads = new Map<string, Promise<string | null>>();

function normalizeRemoteUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/')) {
    try {
      const apiHost = requireApiBaseUrl().replace(/\/api\/v1\/?$/, '');
      return `${apiHost}${trimmed}`;
    } catch {
      return trimmed;
    }
  }
  if (trimmed.startsWith('http://') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
    return trimmed.replace(/^http:\/\//, 'https://');
  }
  return trimmed;
}

function inferExtension(url: string, explicitExt?: 'jpg' | 'png' | 'webp'): 'jpg' | 'png' | 'webp' {
  if (explicitExt) return explicitExt;
  const cleanUrl = url.split('?')[0]?.toLowerCase() ?? '';
  if (cleanUrl.endsWith('.png') || cleanUrl.includes('/signature')) return 'png';
  if (cleanUrl.endsWith('.webp')) return 'webp';
  return 'jpg';
}

async function isAccountInactiveResponse(fileUri: string): Promise<boolean> {
  try {
    const raw = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(raw) as { code?: unknown };
    return parsed?.code === 'ACCOUNT_INACTIVE';
  } catch {
    return false;
  }
}

export async function resolveAuthenticatedMediaFile(
  rawUrl: string | null | undefined,
  options: AuthMediaCacheOptions,
): Promise<string | null> {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();

  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://')
  ) {
    return trimmed;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return null;

  const resolvedUrl = normalizeRemoteUrl(trimmed);
  const ext = inferExtension(resolvedUrl, options.ext);
  const safeKey = options.cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_') || 'media';
  const dest = `${cacheDir}${options.cachePrefix}_${safeKey}.${ext}`;

  const existingPromise = inFlightDownloads.get(dest);
  if (existingPromise) {
    return existingPromise;
  }

  const downloadPromise = (async (): Promise<string | null> => {
    const tempUri = `${cacheDir}authmedia_tmp_${Date.now()}_${Math.floor(Math.random() * 100000)}.${ext}`;
    try {
      const info = await FileSystem.getInfoAsync(dest);
      if (info.exists && typeof info.size === 'number' && info.size > 0) {
        return dest;
      }

      const token = await authTokenStore.get();
      const result = await downloadFileWithTimeout(
        resolvedUrl,
        tempUri,
        {
          Accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        DOWNLOAD_TIMEOUT_MS,
      );

      if (result.status < 200 || result.status >= 300) {
        const shouldLogout =
          result.status === 401 ||
          (result.status === 403 && (await isAccountInactiveResponse(result.uri)));
        await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
        await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
        if (shouldLogout) {
          await authTokenStore.handleUnauthorized();
        }
        return null;
      }

      const tempInfo = await FileSystem.getInfoAsync(result.uri);
      if (!tempInfo.exists || typeof tempInfo.size !== 'number' || tempInfo.size <= 0) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
        await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
        return null;
      }

      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      await FileSystem.moveAsync({ from: result.uri, to: dest });
      return dest;
    } catch {
      await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      return null;
    } finally {
      inFlightDownloads.delete(dest);
    }
  })();

  inFlightDownloads.set(dest, downloadPromise);
  return downloadPromise;
}

export async function clearAllAuthMediaCaches(): Promise<void> {
  inFlightDownloads.clear();
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return;

  try {
    const entries = await FileSystem.readDirectoryAsync(cacheDir);
    const targets = entries.filter((name) =>
      MEDIA_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)),
    );
    await Promise.all(
      targets.map((name) =>
        FileSystem.deleteAsync(`${cacheDir}${name}`, { idempotent: true }).catch(() => {}),
      ),
    );
  } catch {
    // Best-effort cache cleanup
  }
}
