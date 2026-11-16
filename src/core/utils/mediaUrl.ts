import { requireApiBaseUrl } from '../config/apiConfig';

/**
 * Resolves attendance media URLs (selfie and signature) safely:
 * 1. Preserves raw `data:image/...` Base64 strings from local check-in submissions.
 * 2. Preserves local filesystem `file://` URIs.
 * 3. Normalizes remote server URLs:
 *    - Replaces outdated localhost/127.0.0.1 or cleartext HTTP hosts with the active HTTPS API base URL.
 *    - If raw URL is relative or empty, generates the canonical backend endpoint:
 *      `${requireApiBaseUrl()}/attendances/${attendanceId}/${type}`
 */
export function resolveAttendanceMediaUrl(
  rawUrl: string | null | undefined,
  attendanceId: string,
  type: 'selfie' | 'signature'
): string | null {
  if (!rawUrl && !attendanceId) return null;

  // 1. Local Base64 Data URI or Local File URI
  if (rawUrl) {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('file://')) {
      return trimmed;
    }
  }

  // 2. Canonical URL construction using active API base URL
  try {
    const baseUrl = requireApiBaseUrl(); // e.g. "https://preview.daffiq.tech/api/v1"
    const canonicalUrl = `${baseUrl}/attendances/${encodeURIComponent(attendanceId)}/${type}`;

    if (!rawUrl || rawUrl.trim() === '') {
      return null;
    }

    const trimmed = rawUrl.trim();
    // If rawUrl is a relative path
    if (trimmed.startsWith('/')) {
      const apiHost = baseUrl.replace(/\/api\/v1\/?$/, '');
      return `${apiHost}${trimmed}`;
    }

    // If rawUrl contains localhost or 127.0.0.1 (common from Laravel's APP_URL default)
    if (
      trimmed.includes('localhost') ||
      trimmed.includes('127.0.0.1') ||
      trimmed.includes('0.0.0.0')
    ) {
      return canonicalUrl;
    }

    // If rawUrl is cleartext HTTP, upgrade to HTTPS
    if (trimmed.startsWith('http://')) {
      return trimmed.replace(/^http:\/\//, 'https://');
    }

    return trimmed;
  } catch {
    return rawUrl ?? null;
  }
}

/**
 * Resolves the protected Surat Edaran `stream_url` for use by the authenticated API client:
 * 1. Preserves local `file://`, `content://`, or `data:` URIs (from local attachment picker).
 * 2. If rawUrl is null/undefined or empty string, returns null.
 * 3. If rawUrl is a root-relative API route, prepends the backend origin.
 * 4. If rawUrl contains localhost, 127.0.0.1, or cleartext http:
 *    upgrades/replaces the host with the active API base host over HTTPS.
 * The public `/storage/...` URL must not be used as a fallback for API documents.
 */
export function resolveSuratEdaranUrl(
  rawUrl: string | null | undefined
): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // 1. Local URIs
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://')
  ) {
    return trimmed;
  }

  try {
    const baseUrl = requireApiBaseUrl(); // e.g. "https://preview.daffiq.tech/api/v1"
    const apiHost = baseUrl.replace(/\/api\/v1\/?$/, ''); // e.g. "https://preview.daffiq.tech"

    // 2. Root-relative paths from Laravel (e.g. "/storage/surat_edaran/xyz.pdf")
    if (trimmed.startsWith('/')) {
      return `${apiHost}${trimmed}`;
    }

    // 3. Localhost or 127.0.0.1 replacement
    if (
      trimmed.includes('localhost') ||
      trimmed.includes('127.0.0.1') ||
      trimmed.includes('0.0.0.0')
    ) {
      const pathMatch = trimmed.match(/^https?:\/\/[^/]+(\/.*)$/);
      if (pathMatch && pathMatch[1]) {
        return `${apiHost}${pathMatch[1]}`;
      }
      return `${apiHost}/${trimmed.replace(/^https?:\/\/[^/]+\/?/, '')}`;
    }

    // 4. Cleartext HTTP upgrade to HTTPS
    if (trimmed.startsWith('http://')) {
      return trimmed.replace(/^http:\/\//, 'https://');
    }

    return trimmed;
  } catch {
    return rawUrl;
  }
}
