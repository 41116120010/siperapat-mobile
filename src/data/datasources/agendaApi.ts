import { File } from 'expo-file-system';
import { ApiBinaryResponse, ApiError, apiClient } from './apiClient';
import { ApiAgendaDto, ApiAgendaPage, ApiDashboardDto, ApiEnvelope } from './apiTypes';
import { userApi } from './userApi';
import { requireApiBaseUrl } from '../../core/config/apiConfig';

export type AgendaFilters = {
  status?: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  type?: 'hybrid' | 'offline' | 'online';
  search?: string;
  unitId?: number | 'all_units';
};
export interface CreateAgendaDto {
  judul_rapat: string; jenis_rapat: string; tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang?: string | null; link_meeting?: string | null; waktu_mulai: string; waktu_selesai?: string | null;
  pimpinan_id?: number | null; notulis_id?: number | null;
  /** Agenda target. `all_units` = all units, `selected_units` = unit_ids, `selected_users` = user_ids. */
  target_type?: 'all_units' | 'selected_units' | 'selected_users';
  is_all_units: boolean; unit_ids?: number[]; user_ids?: number[]; status?: 'draft' | 'scheduled';
  surat_edaran_type?: 'upload' | 'digital';
  open_surat_edaran_after_save?: boolean;
  allow_schedule_overlap?: boolean;
}
export interface UpdateAgendaDto extends Omit<Partial<CreateAgendaDto>, 'status'> {
  status?: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}
export interface UploadFileRef { uri: string; name: string; type: string }
export interface UpdateMinutesDto {
  notulensi?: string | null;
  kesimpulan?: string | null;
  photos?: UploadFileRef[];
  captions?: string[];
}
function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}

function protectedSuratEdaranPath(streamUrl: string): string {
  let apiBase: URL;
  let stream: URL;
  try {
    apiBase = new URL(requireApiBaseUrl());
    stream = new URL(streamUrl, apiBase);
  } catch {
    throw new ApiError('configuration', 'Alamat streaming surat edaran tidak valid.');
  }

  const basePath = apiBase.pathname.replace(/\/+$/, '');
  if (stream.origin !== apiBase.origin || !stream.pathname.startsWith(`${basePath}/`)) {
    throw new ApiError('configuration', 'Alamat streaming surat edaran tidak sesuai dengan server API.');
  }
  if (stream.search || stream.hash) {
    throw new ApiError('configuration', 'Alamat streaming surat edaran tidak valid.');
  }

  const endpointPath = stream.pathname.slice(basePath.length);
  if (!/^\/agendas\/\d+\/surat-edaran$/.test(endpointPath)) {
    throw new ApiError('configuration', 'Alamat streaming surat edaran tidak valid.');
  }

  return `${endpointPath}${stream.search}`;
}
export function resolveFileMimeType(filename: string, fallbackMime?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return fallbackMime && fallbackMime !== 'application/octet-stream' ? fallbackMime : 'application/pdf';
  }
}

export interface ExpoFormDataFilePart {
  name: string;
  type: string;
  bytes: () => Promise<Uint8Array>;
}

/**
 * Creates an Expo WinterCG-compliant FormData file part.
 * Modern Expo SDK 52+ / 57 fetch expects an object implementing `.bytes()` or a Blob,
 * rather than legacy React Native `{ uri, name, type }` objects.
 */
export function createFormDataFilePart(fileRef: UploadFileRef): ExpoFormDataFilePart {
  const mime = resolveFileMimeType(fileRef.name, fileRef.type);
  return {
    name: fileRef.name,
    type: mime,
    bytes: async (): Promise<Uint8Array> => {
      // 1. Primary: expo-file-system File class (native C++/Kotlin/Swift reader)
      try {
        const file = new File(fileRef.uri);
        const data = await file.bytes();
        if (data && data.length > 0) return data;
      } catch (fileErr) {
        if (__DEV__) {
          console.warn(`[createFormDataFilePart] File.bytes() failed for ${fileRef.name}:`, fileErr);
        }
      }

      // 2. Secondary fallback: React Native global fetch for blob/data
      try {
        const res = await globalThis.fetch(fileRef.uri);
        const blob = await res.blob();
        const arrayBuf = await new Response(blob).arrayBuffer();
        return new Uint8Array(arrayBuf);
      } catch (fetchErr) {
        if (__DEV__) {
          console.warn(`[createFormDataFilePart] fetch blob fallback failed for ${fileRef.name}:`, fetchErr);
        }
      }

      throw new Error(`Tidak dapat memproses berkas "${fileRef.name}". Pastikan berkas dapat diakses.`);
    },
  };
}

function appendAgendaFormFields(
  form: FormData,
  data: CreateAgendaDto | UpdateAgendaDto,
): void {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      if (key === 'waktu_selesai' || key === 'pimpinan_id' || key === 'notulis_id') {
        form.append(key, '');
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(`${key}[]`, String(item)));
      return;
    }
    form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });
}

export const agendaApi = {
  downloadSuratEdaran: (streamUrl: string) => apiClient.get<ApiBinaryResponse>(
    protectedSuratEdaranPath(streamUrl),
    { responseType: 'binary' }
  ),
  dashboard: () => apiClient.get<ApiEnvelope<ApiDashboardDto>>('/dashboard'),
  list: (page = 1, perPage = 10, filters: AgendaFilters = {}) => {
    const query = queryString({ page, per_page: perPage, status: filters.status, tipe_rapat: filters.type, search: filters.search, unit_id: filters.unitId });
    return apiClient.get<ApiAgendaPage>(`/agendas?${query}`);
  },
  updateStatus: (
    id: string | number,
    status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled',
    allowScheduleOverlap?: boolean,
  ) =>
    apiClient.patch<ApiEnvelope<ApiAgendaDto>>(
      `/agendas/${encodeURIComponent(id)}/status`,
      allowScheduleOverlap !== undefined
        ? { status, allow_schedule_overlap: allowScheduleOverlap }
        : { status },
    ),
  addParticipants: (id: string | number, userIds: number[]) =>
    apiClient.post<ApiEnvelope<ApiAgendaDto>>(
      `/agendas/${encodeURIComponent(id)}/participants`,
      { user_ids: userIds },
    ),
  detail: (id: string) => apiClient.get<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}`),
  updateMinutes: (id: string, data: UpdateMinutesDto) => {
    if (data.photos && data.photos.length > 0) {
      const form = new FormData();
      form.append('_method', 'PUT');
      if (data.notulensi !== undefined && data.notulensi !== null) form.append('notulensi', data.notulensi);
      if (data.kesimpulan !== undefined && data.kesimpulan !== null) form.append('kesimpulan', data.kesimpulan);
      data.photos.forEach((photo) => {
        form.append('photos[]', createFormDataFilePart(photo) as unknown as Blob);
      });
      data.captions?.forEach((caption) => form.append('captions[]', caption));
      return apiClient.post<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}/notulen`, form, {
        headers: { 'X-HTTP-Method-Override': 'PUT' },
      });
    }
    return apiClient.put<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}/notulen`, data);
  },
  uploadSuratEdaran: async (
    id: string | number,
    suratEdaran: UploadFileRef,
    agendaData?: UpdateAgendaDto
  ) => {
    const fileMime = resolveFileMimeType(suratEdaran.name, suratEdaran.type);
    const normalizedFile: UploadFileRef = {
      uri: suratEdaran.uri,
      name: suratEdaran.name,
      type: fileMime,
    };

    // If agenda data context is available, use the canonical PUT /agendas/{id} contract directly
    if (agendaData && agendaData.judul_rapat && agendaData.waktu_mulai) {
      return agendaApi.update(id, agendaData, normalizedFile);
    }

    // Attempt direct upload or transparent fallback to canonical update
    try {
      const form = new FormData();
      form.append('surat_edaran', createFormDataFilePart(normalizedFile) as unknown as Blob);
      return await apiClient.post<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}/surat-edaran`, form);
    } catch (error) {
      // If standalone route is not available (e.g. 404 on live server), fallback to canonical PUT update
      const detailRes = await agendaApi.detail(String(id));
      const current = detailRes.data;
      const fallbackDto: UpdateAgendaDto = {
        judul_rapat: current.judul_rapat,
        jenis_rapat: current.jenis_rapat,
        tipe_rapat: current.tipe_rapat as 'offline' | 'online' | 'hybrid',
        waktu_mulai: current.waktu_mulai,
        waktu_selesai: current.waktu_selesai,
        lokasi_ruang: current.lokasi_ruang,
        link_meeting: current.link_meeting,
        pimpinan_id: current.pimpinan?.id,
        notulis_id: current.notulis?.id,
        target_type: current.target_type,
        is_all_units: current.is_all_units,
        unit_ids: current.units?.map((u) => u.id),
        // Preserve invited participants only when the API actually returns them.
        // The current API detail endpoint does not eager-load invited_users, so this
        // may be undefined for selected_users; the update then fails validation
        // instead of silently dropping the target. See backend dependency note.
        user_ids: current.invited_users?.map((u) => u.id),
        status: current.status?.value as any,
      };
      return agendaApi.update(id, fallbackDto, normalizedFile);
    }
  },
  create: (data: CreateAgendaDto, suratEdaran?: UploadFileRef) => {
    if (!suratEdaran) return apiClient.post<ApiEnvelope<ApiAgendaDto>>('/agendas', data);
    const form = new FormData();
    appendAgendaFormFields(form, data);
    form.append('surat_edaran', createFormDataFilePart(suratEdaran) as unknown as Blob);
    return apiClient.post<ApiEnvelope<ApiAgendaDto>>('/agendas', form);
  },
  update: (id: string | number, data: UpdateAgendaDto, suratEdaran?: UploadFileRef) => {
    if (!suratEdaran) return apiClient.put<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}`, data);
    const form = new FormData();
    form.append('_method', 'PUT');
    appendAgendaFormFields(form, data);
    form.append('surat_edaran', createFormDataFilePart(suratEdaran) as unknown as Blob);
    return apiClient.post<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}`, form, {
      headers: { 'X-HTTP-Method-Override': 'PUT' },
    });
  },
  delete: (id: string | number) => apiClient.delete<ApiEnvelope<never>>(`/agendas/${encodeURIComponent(id)}`),
  formOptions: async () => {
    const [candidatesRes, unitsRes] = await Promise.all([
      userApi.candidates(),
      userApi.units(1, undefined, 100, { all: true, status: 'active' }),
    ]);
    return { users: candidatesRes.data, units: unitsRes.data };
  },
};
