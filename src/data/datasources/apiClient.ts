import { API_TIMEOUT_MS, requireApiBaseUrl } from '../../core/config/apiConfig';
import { authTokenStore } from './authTokenStore';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiResponseType = 'json' | 'binary';
export interface ApiBinaryResponse { blob: Blob; filename: string | null; contentType: string | null }
export interface ApiRequestOptions { method?: ApiMethod; body?: unknown; authenticated?: boolean; responseType?: ApiResponseType; timeoutMs?: number; headers?: Record<string, string> }

export class ApiError extends Error {
  constructor(readonly kind: 'http' | 'network' | 'timeout' | 'configuration', message: string, readonly status?: number, readonly errors?: Record<string, string[]>, readonly retryAfterSeconds?: number) {
    super(message); this.name = 'ApiError';
  }
}

function firstValidationMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return undefined;
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: { message?: unknown; errors?: unknown } = {};
  try { payload = await response.json() as typeof payload; } catch { /* non-JSON gateway response */ }
  const fallback: Record<number, string> = {
    401: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.',
    403: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
    422: 'Periksa kembali data yang dimasukkan.',
    429: 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.',
  };
  const errors = payload.errors && typeof payload.errors === 'object' ? payload.errors as Record<string, string[]> : undefined;
  const message = (response.status === 422 ? firstValidationMessage(errors) : undefined)
    ?? (typeof payload.message === 'string' ? payload.message : undefined)
    ?? fallback[response.status]
    ?? `Permintaan gagal (HTTP ${response.status}).`;
  return new ApiError('http', message, response.status, errors, Number(response.headers.get('Retry-After')) || undefined);
}

function downloadFilename(response: Response): string | null {
  const disposition = response.headers.get('Content-Disposition');
  if (!disposition) return null;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  let candidate = plain;
  if (encoded) {
    try { candidate = decodeURIComponent(encoded); } catch { candidate = plain; }
  }
  return candidate?.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || null;
}

function isFormDataPayload(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  return (
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    typeof (body as { append?: unknown }).append === 'function' ||
    Array.isArray((body as { _parts?: unknown })._parts)
  );
}

class ApiClient {
  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    let url: string;
    try { url = `${requireApiBaseUrl()}/${path.replace(/^\/+/, '')}`; }
    catch (error) { throw new ApiError('configuration', error instanceof Error ? error.message : 'Konfigurasi API belum tersedia.'); }

    const headers = new Headers(options.headers);
    const multipart = isFormDataPayload(options.body);
    if (options.body !== undefined && !multipart) {
      headers.set('Content-Type', 'application/json');
    } else if (multipart && headers.has('Content-Type')) {
      headers.delete('Content-Type');
    }
    headers.set('Accept', options.responseType === 'binary' ? '*/*' : 'application/json');
    if (options.authenticated !== false) {
      const token = await authTokenStore.get();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : (multipart ? options.body as FormData : JSON.stringify(options.body)),
        signal: controller.signal,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn(`[ApiClient] Request to ${options.method ?? 'GET'} ${url} failed:`, error);
      }
      const timeoutError = error instanceof Error && error.name === 'AbortError';
      const isFormDataError = error instanceof Error && error.message?.includes('FormDataPart');
      let detailMsg = 'Tidak dapat terhubung ke server. Periksa koneksi internet atau ketersediaan layanan.';
      if (timeoutError) {
        detailMsg = 'Permintaan ke server melewati batas waktu.';
      } else if (isFormDataError) {
        detailMsg = 'Format berkas tidak dapat diproses oleh runtime perangkat.';
      } else if (error instanceof Error && error.message && error.message !== 'Network request failed') {
        detailMsg = `Tidak dapat terhubung ke server: ${error.message}`;
      }
      throw new ApiError(
        timeoutError ? 'timeout' : 'network',
        detailMsg
      );
    } finally { clearTimeout(timeout); }

    if (!response.ok) {
      const error = await toApiError(response);
      if (response.status === 401 && options.authenticated !== false) await authTokenStore.handleUnauthorized();
      throw error;
    }
    if (response.status === 204) return undefined as T;
    if (options.responseType === 'binary') return {
      blob: await response.blob(), filename: downloadFilename(response), contentType: response.headers.get('Content-Type'),
    } as T;
    return await response.json() as T;
  }
  get<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) { return this.request<T>(path, { ...options, method: 'GET' }); }
  post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) { return this.request<T>(path, { ...options, method: 'POST', body }); }
  put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) { return this.request<T>(path, { ...options, method: 'PUT', body }); }
  patch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) { return this.request<T>(path, { ...options, method: 'PATCH', body }); }
  delete<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) { return this.request<T>(path, { ...options, method: 'DELETE' }); }
}

export const apiClient = new ApiClient();
