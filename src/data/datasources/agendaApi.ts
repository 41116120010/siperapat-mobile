import { apiClient } from './apiClient';
import { ApiAgendaDto, ApiDashboardDto, ApiEnvelope, ApiPaginated, ApiUnitDto, ApiUserDto } from './apiTypes';

export type AgendaFilters = { status?: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'; type?: 'hybrid' | 'offline' | 'online'; search?: string; unitId?: number };
export interface CreateAgendaDto {
  judul_rapat: string; jenis_rapat: string; tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang?: string | null; link_meeting?: string | null; waktu_mulai: string; waktu_selesai?: string | null;
  pimpinan_id?: number | null; notulis_id?: number | null; is_all_units: boolean; unit_ids?: number[]; status?: 'draft' | 'scheduled';
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
export const agendaApi = {
  dashboard: () => apiClient.get<ApiEnvelope<ApiDashboardDto>>('/dashboard'),
  list: (page = 1, perPage = 10, filters: AgendaFilters = {}) => {
    const query = queryString({ page, per_page: perPage, status: filters.status, tipe_rapat: filters.type, search: filters.search, unit_id: filters.unitId });
    return apiClient.get<ApiPaginated<ApiAgendaDto>>(`/agendas?${query}`);
  },
  detail: (id: string) => apiClient.get<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}`),
  updateMinutes: (id: string, data: UpdateMinutesDto) => {
    if (data.photos && data.photos.length > 0) {
      const form = new FormData();
      form.append('_method', 'PUT');
      if (data.notulensi !== undefined && data.notulensi !== null) form.append('notulensi', data.notulensi);
      if (data.kesimpulan !== undefined && data.kesimpulan !== null) form.append('kesimpulan', data.kesimpulan);
      data.photos.forEach((photo) => {
        form.append('photos[]', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
      });
      data.captions?.forEach((caption) => form.append('captions[]', caption));
      return apiClient.post<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}/notulen`, form, {
        headers: { 'X-HTTP-Method-Override': 'PUT' },
      });
    }
    return apiClient.put<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}/notulen`, data);
  },
  uploadSuratEdaran: (id: string | number, suratEdaran: UploadFileRef) => {
    const form = new FormData();
    form.append('surat_edaran', { uri: suratEdaran.uri, name: suratEdaran.name, type: suratEdaran.type } as unknown as Blob);
    return apiClient.post<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}/surat-edaran`, form);
  },
  create: (data: CreateAgendaDto, suratEdaran?: UploadFileRef) => {
    if (!suratEdaran) return apiClient.post<ApiEnvelope<ApiAgendaDto>>('/agendas', data);
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) value.forEach((item) => form.append(`${key}[]`, String(item)));
        else form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      }
    });
    form.append('surat_edaran', { uri: suratEdaran.uri, name: suratEdaran.name, type: suratEdaran.type } as unknown as Blob);
    return apiClient.post<ApiEnvelope<ApiAgendaDto>>('/agendas', form);
  },
  update: (id: string | number, data: UpdateAgendaDto, suratEdaran?: UploadFileRef) => {
    if (!suratEdaran) return apiClient.put<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}`, data);
    const form = new FormData();
    form.append('_method', 'PUT');
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) value.forEach((item) => form.append(`${key}[]`, String(item)));
        else form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      }
    });
    form.append('surat_edaran', { uri: suratEdaran.uri, name: suratEdaran.name, type: suratEdaran.type } as unknown as Blob);
    return apiClient.post<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}`, form, {
      headers: { 'X-HTTP-Method-Override': 'PUT' },
    });
  },
  delete: (id: string | number) => apiClient.delete<ApiEnvelope<never>>(`/agendas/${encodeURIComponent(id)}`),
  formOptions: async () => {
    const [usersFirstPage, units] = await Promise.all([
      apiClient.get<ApiPaginated<ApiUserDto>>('/users?status=active&per_page=50&page=1'),
      apiClient.get<ApiEnvelope<ApiUnitDto[]>>('/units?all=true&status=active'),
    ]);
    const users = [...usersFirstPage.data];
    for (let page = 2; page <= usersFirstPage.meta.last_page; page += 1) users.push(...(await apiClient.get<ApiPaginated<ApiUserDto>>(`/users?status=active&per_page=50&page=${page}`)).data);
    return { users, units: units.data };
  },
};
