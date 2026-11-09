export interface ApiEnvelope<T> { success: boolean; message: string; data: T }
export interface ApiPaginationMeta { current_page: number; last_page: number; per_page: number; total: number }
export interface ApiPaginated<T> extends ApiEnvelope<T[]> { meta: ApiPaginationMeta }
/** Response shape for GET /users/candidates (non-paginated, meta only carries total). */
export interface ApiCandidateList<T> extends ApiEnvelope<T[]> { meta: { total: number } }
export interface ApiDashboardDto {
  stats: { total_agendas: number; ongoing_agendas: number; completed_agendas: number; upcoming_agendas: number; total_users?: number; total_units?: number; total_attendances?: number; my_attendances?: number; attendance_rate?: number; attendance_rate_label?: string; attendance_rate_subtext?: string };
  active_agendas: ApiAgendaDto[]; recent_attendances: ApiAttendanceDto[];
}
export interface ApiUnitDto { id: number; nama_unit: string; kode_unit: string; deskripsi: string | null; is_active: boolean; users_count?: number; agendas_count?: number }
export interface ApiUserDto {
  id: number; name: string; nip: string | null; username: string; email: string | null; phone: string | null;
  jabatan?: string | null; pangkat_golongan?: string | null; avatar_url: string | null; role: { value: string; label: string }; is_active: boolean; unit_id: number | null; unit?: ApiUnitDto | null;
  security?: { last_password_changed_at?: string | null; last_password_changed_label?: string | null; last_api_login_at?: string | null; last_api_login_label?: string | null };
  attendance_stats?: { total_agendas?: number; total_agendas_label?: string; completed_agendas?: number; total_attended?: number; attendance_rate?: number; attendance_rate_label?: string; on_time_count?: number; on_time_rate?: number; on_time_rate_label?: string; period_label?: string };
  created_at?: string | null; updated_at?: string | null;
}
export interface ApiActivityLogDto { id: number; user_id: number | null; user?: ApiUserDto | null; activity_type: string; category?: { value: string; label: string }; description: string; target_model: string | null; target_id: number | null; properties: Record<string, unknown> | null; ip_address: string | null; user_agent: string | null; created_at: string | null }
export interface ApiAgendaDto {
  id: number; judul_rapat: string; slug: string; jenis_rapat: string; tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang: string | null; link_meeting: string | null; waktu_mulai: string; waktu_selesai: string | null;
  rentang_waktu: string | null; jadwal_lengkap: string | null; is_all_units: boolean;
  target_type?: 'all_units' | 'selected_units' | 'selected_users';
  status: { value: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'; label: string };
  surat_edaran?: { url: string | null; stream_url?: string | null; extension: string | null; is_pdf: boolean; is_image: boolean };
  creator?: ApiUserDto | null; pimpinan?: ApiUserDto | null; notulis?: ApiUserDto | null; units?: ApiUnitDto[];
  attendances_count?: number; is_eligible?: boolean; has_attended?: boolean;
  nomor_ba?: string | null; total_invited?: number; total_attended?: number; unattended_count?: number; participation_rate?: number; participation_rate_label?: string;
  export_links?: { pdf?: string; word?: string; csv?: string };
  notulensi_html?: string | null; kesimpulan_html?: string | null; documentations?: Array<{ id: number; url: string; caption?: string | null }>;
  invited_users?: ApiUserDto[];
  created_at?: string | null; updated_at?: string | null;
}
export interface ApiAttendanceDto {
  id: number; agenda_id: number; user_id: number;
  user?: Pick<ApiUserDto, 'id' | 'name' | 'nip' | 'role' | 'unit' | 'jabatan' | 'pangkat_golongan'> | null;
  agenda?: { id: number; judul_rapat: string; slug?: string; tipe_rapat?: 'hybrid' | 'offline' | 'online'; lokasi_ruang?: string | null; waktu_mulai?: string | null; waktu_selesai?: string | null; nomor_ba?: string | null } | null;
  verification_token?: string | null; receipt?: ApiAttendanceReceiptDto | null; status?: 'belum_hadir';
  signed_at: string | null; selfie_url: string | null; signature_url: string | null; ip_address: string | null; user_agent: string | null;
  created_at: string | null; updated_at: string | null;
}
export interface ApiAttendanceReceiptDto {
  nomor_bukti: string | null; verification_token: string | null;
  institutional_header: { kementerian: string; instansi: string; alamat: string };
  meeting: { judul_rapat: string; nomor_ba: string | null; format_kedinasan?: string | null; tipe_rapat?: string | null; lokasi_ruang?: string | null; link_meeting?: string | null; rentang_waktu?: string | null; jadwal_lengkap?: string | null } | null;
  participant: { name: string; nip: string | null; jabatan: string | null; unit_kerja: string } | null;
  validation: { status: 'tercatat'; status_label: string; metode_verifikasi: string; ip_address: string | null; user_agent: string | null; signed_at: string | null };
}
export interface ApiForgotPasswordDto {
  masked_email: string;
}
