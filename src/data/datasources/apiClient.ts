import { API_TIMEOUT_MS, requireApiBaseUrl } from '../../core/config/apiConfig';
import { authTokenStore } from './authTokenStore';

export type ApiResponseType = 'json' | 'binary';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
  responseType?: ApiResponseType;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly errors?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;
  readonly kind: 'http' | 'network' | 'timeout' | 'configuration';

  constructor(args: {
    message: string;
    kind: ApiError['kind'];
    status?: number;
    errors?: Record<string, string[]>;
    retryAfterSeconds?: number;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.kind = args.kind;
    this.status = args.status;
    this.errors = args.errors;
    this.retryAfterSeconds = args.retryAfterSeconds;
  }
}

type ErrorPayload = {
  message?: unknown;
  errors?: unknown;
};

function validationMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const first = Object.values(errors as Record<string, unknown>)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .find((value): value is string => typeof value === 'string');
  return first;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ErrorPayload = {};
  try {
    payload = (await response.json()) as ErrorPayload;
  } catch {
    // Some gateways return an empty or non-JSON error response.
  }

  const status = response.status;
  const defaultMessage: Record<number, string> = {
    401: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.',
    403: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
    422: 'Periksa kembali data yang dimasukkan.',
    429: 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.',
  };
  const serverMessage =
    typeof payload.message === 'string' ? payload.message : undefined;
  const validation = validationMessage(payload.errors);

  return new ApiError({
    kind: 'http',
    status,
    message:
      (status === 422 ? validation : undefined) ??
      serverMessage ??
      defaultMessage[status] ??
      `Permintaan gagal (HTTP ${status}).`,
    errors:
      payload.errors && typeof payload.errors === 'object'
        ? (payload.errors as Record<string, string[]>)
        : undefined,
    retryAfterSeconds: response.headers.get('Retry-After')
      ? Number(response.headers.get('Retry-After'))
      : undefined,
  });
}

class ApiClient {
  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    let baseUrl: string;
    try {
      baseUrl = requireApiBaseUrl();
    } catch (error) {
      throw new ApiError({
        kind: 'configuration',
        message:
          error instanceof Error ? error.message : 'Konfigurasi API belum tersedia.',
      });
    }

    const headers = new Headers(options.headers);
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (options.body !== undefined && !isFormData) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept', options.responseType === 'binary' ? '*/*' : 'application/json');

    if (options.authenticated !== false) {
      const token = await authTokenStore.get();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? API_TIMEOUT_MS
    );
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/${path.replace(/^\/+/, '')}`, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined
            ? undefined
            : isFormData
              ? (options.body as FormData)
              : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new ApiError({
        kind: timedOut ? 'timeout' : 'network',
        message: timedOut
          ? 'Permintaan ke server melewati batas waktu. Coba lagi.'
          : 'Tidak dapat terhubung ke server. Periksa koneksi dan alamat API.',
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const apiError = await parseError(response);
      if (response.status === 401 && options.authenticated !== false) {
        await authTokenStore.clear().catch(() => undefined);
      }
      throw apiError;
    }

    if (response.status === 204) return undefined as T;
    if (options.responseType === 'binary') return (await response.blob()) as T;
    return (await response.json()) as T;
  }

  get<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
