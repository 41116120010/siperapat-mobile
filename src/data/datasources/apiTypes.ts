export interface ApiEnvelope<T> { success: boolean; message: string; data: T }
export interface ApiPaginationMeta { current_page: number; last_page: number; per_page: number; total: number }
export interface ApiPaginated<T> extends ApiEnvelope<T[]> { meta: ApiPaginationMeta }
export interface ApiDashboardDto {
  stats: { total_agendas: number; ongoing_agendas: number; completed_agendas: number; upcoming_agendas: number; total_users?: number; total_units?: number; total_attendances?: number; my_attendances?: number };
  active_agendas: ApiAgendaDto[]; recent_attendances: unknown[];
}
export interface ApiUnitDto { id: number; nama_unit: string; kode_unit: string; deskripsi: string | null; is_active: boolean }
export interface ApiUserDto {
  id: number; name: string; nip: string | null; username: string; email: string | null; phone: string | null;
  avatar_url: string | null; role: { value: string; label: string }; is_active: boolean; unit_id: number | null; unit?: ApiUnitDto | null;
}
export interface ApiAgendaDto {
  id: number; judul_rapat: string; slug: string; jenis_rapat: string; tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang: string | null; link_meeting: string | null; waktu_mulai: string; waktu_selesai: string | null;
  rentang_waktu: string | null; jadwal_lengkap: string | null; is_all_units: boolean;
  status: { value: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'; label: string };
  surat_edaran?: { url: string | null; extension: string | null; is_pdf: boolean; is_image: boolean };
  creator?: ApiUserDto | null; pimpinan?: ApiUserDto | null; notulis?: ApiUserDto | null; units?: ApiUnitDto[];
  attendances_count?: number; is_eligible?: boolean; has_attended?: boolean;
  notulensi_html?: string | null; kesimpulan_html?: string | null; documentations?: Array<{ id: number; url: string; caption?: string | null }>;
  created_at?: string | null; updated_at?: string | null;
}
export interface ApiAttendanceDto {
  id: number; agenda_id: number; user_id: number;
  user?: Pick<ApiUserDto, 'id' | 'name' | 'nip' | 'role' | 'unit'> | null;
  signed_at: string | null; selfie_url: string | null; signature_url: string | null; ip_address: string | null; user_agent: string | null;
  created_at: string | null; updated_at: string | null;
}
