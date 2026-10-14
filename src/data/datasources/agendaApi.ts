import { apiClient } from './apiClient';
import { ApiEnvelope } from './authApi';

export interface ApiAgendaUserDto {
  id: number;
  name: string;
  nip: string | null;
  role: { value: string; label: string };
  unit?: { nama_unit: string } | null;
}

export interface ApiAgendaUnitDto {
  id: number;
  nama_unit: string;
  kode_unit: string;
  deskripsi: string | null;
  is_active: boolean;
}

export interface ApiAgendaDto {
  id: number;
  judul_rapat: string;
  slug: string;
  jenis_rapat: string;
  tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang: string | null;
  link_meeting: string | null;
  waktu_mulai: string;
  waktu_selesai: string | null;
  rentang_waktu: string | null;
  jadwal_lengkap: string | null;
  is_all_units: boolean;
  status: { value: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'; label: string };
  surat_edaran?: { url: string | null; extension: string | null; is_pdf: boolean; is_image: boolean };
  creator?: ApiAgendaUserDto | null;
  pimpinan?: ApiAgendaUserDto | null;
  notulis?: ApiAgendaUserDto | null;
  units?: ApiAgendaUnitDto[];
  attendances_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiPaginated<T> extends ApiEnvelope<T[]> {
  meta: ApiPaginationMeta;
}

export interface ApiDashboardStats {
  total_agendas: number;
  ongoing_agendas: number;
  completed_agendas: number;
  upcoming_agendas: number;
  total_users?: number;
  total_units?: number;
  total_attendances?: number;
  my_attendances?: number;
}

export interface ApiDashboardDto {
  stats: ApiDashboardStats;
  active_agendas: ApiAgendaDto[];
  recent_attendances: unknown[];
}

export interface CreateAgendaRequestDto {
  judul_rapat: string;
  jenis_rapat: string;
  tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang?: string | null;
  link_meeting?: string | null;
  waktu_mulai: string;
  waktu_selesai?: string | null;
  pimpinan_id?: number | null;
  notulis_id?: number | null;
  is_all_units: boolean;
  unit_ids?: number[];
  status?: 'draft' | 'scheduled';
}

export const agendaApi = {
  dashboard: () => apiClient.get<ApiEnvelope<ApiDashboardDto>>('/dashboard'),

  list: (page = 1, perPage = 50, type?: 'hybrid' | 'offline' | 'online') =>
    apiClient.get<ApiPaginated<ApiAgendaDto>>(
      `/agendas?page=${page}&per_page=${perPage}${type ? `&tipe_rapat=${type}` : ''}`
    ),

  detail: (id: string) =>
    apiClient.get<ApiEnvelope<ApiAgendaDto>>(`/agendas/${encodeURIComponent(id)}`),

  create: (payload: CreateAgendaRequestDto) =>
    apiClient.post<ApiEnvelope<ApiAgendaDto>>('/agendas', payload),

  formOptions: async () => {
    const [firstUsers, units] = await Promise.all([
      apiClient.get<ApiPaginated<ApiAgendaUserDto>>('/users?per_page=50&status=active&page=1'),
      apiClient.get<ApiEnvelope<ApiAgendaUnitDto[]>>('/units?all=true&status=active'),
    ]);
    const users = [...firstUsers.data];
    for (let page = 2; page <= firstUsers.meta.last_page; page += 1) {
      const response = await apiClient.get<ApiPaginated<ApiAgendaUserDto>>(
        `/users?per_page=50&status=active&page=${page}`
      );
      users.push(...response.data);
    }
    return { users, units: units.data };
  },
};
