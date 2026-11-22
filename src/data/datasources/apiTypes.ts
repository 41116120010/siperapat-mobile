export interface ApiEnvelope<T> { success: boolean; message: string; data: T }
export interface ApiPaginationMeta { current_page: number; last_page: number; per_page: number; total: number }
export interface ApiPaginated<T> extends ApiEnvelope<T[]> { meta: ApiPaginationMeta }
/** Response shape for GET /users/candidates (non-paginated, meta only carries total). */
export interface ApiCandidateList<T> extends ApiEnvelope<T[]> { meta: { total: number } }
export type ApiUserRoleValue = 'administrator' | 'admin' | 'staff';
export interface CreateUserPayload {
  name: string; nip: string; username: string; email: string; password: string; role: ApiUserRoleValue;
  unit_id?: number; phone?: string | null; is_active?: boolean; jabatan?: string | null; pangkat_golongan?: string | null;
}
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
export interface ApiAgendaStatusCounts {
  all: number;
  draft: number;
  ongoing: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}
export interface ApiReportConfig {
  show_kop?: boolean;
  show_logo?: boolean;
  custom_logo_path?: string | null;
  instansi_induk?: string;
  instansi_pelaksana?: string;
  alamat_kontak?: string;
  document_title?: string;
  show_document_number?: boolean;
  document_number?: string;
  show_dasar_surat?: boolean;
  dasar_surat?: string | null;
  show_opening_ba?: boolean;
  opening_ba?: string | null;
  show_meeting_info?: boolean;
  custom_agenda_title?: string;
  custom_location?: string;
  show_attendees?: boolean;
  show_nip?: boolean;
  show_unit?: boolean;
  show_attendance_time?: boolean;
  show_selfie_photos?: boolean;
  show_attendee_signatures?: boolean;
  show_notulensi?: boolean;
  show_kesimpulan?: boolean;
  show_closing_ba?: boolean;
  penutup?: string | null;
  show_documentation?: boolean;
  signing_city?: string;
  signing_date?: string;
  signer1_prefix?: string | null;
  signer1_role?: string;
  signer1_name?: string;
  signer1_nip?: string;
  show_signer1_signature?: boolean;
  signer2_role?: string;
  signer2_name?: string;
  signer2_nip?: string;
  show_signer2_signature?: boolean;
  show_signer3?: boolean;
  signer3_prefix?: string | null;
  signer3_role?: string;
  signer3_name?: string;
  signer3_nip?: string;
  signer3_user_id?: number | string | null;
  show_signer3_signature?: boolean;
  show_tembusan?: boolean;
  tembusan?: string | null;
  show_footer_note?: boolean;
  footer_note?: string;
  [key: string]: unknown;
}
export interface ApiAgendaDto {
  id: number; judul_rapat: string; slug: string; jenis_rapat: string; tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang: string | null; link_meeting: string | null; waktu_mulai: string; waktu_selesai: string | null;
  rentang_waktu: string | null; jadwal_lengkap: string | null; is_all_units: boolean;
  target_type?: 'all_units' | 'selected_units' | 'selected_users';
  target_label?: string;
  status: { value: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'; label: string };
  allowed_transitions?: Array<'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'>;
  can_start_now?: boolean;
  is_overdue?: boolean;
  earliest_start_at?: string | null;
  effective_end_at?: string | null;
  surat_edaran?: { type?: 'upload' | 'digital'; is_digital?: boolean; url: string | null; stream_url?: string | null; extension: string | null; is_pdf: boolean; is_image: boolean };
  creator?: ApiUserDto | null; pimpinan?: ApiUserDto | null; notulis?: ApiUserDto | null;
  nama_pimpinan?: string; nama_notulis?: string;
  units?: ApiUnitDto[];
  attendances_count?: number; is_eligible?: boolean; has_attended?: boolean;
  my_attendance?: ApiAttendanceDto | null;
  has_notulensi?: boolean;
  nomor_ba?: string | null; total_invited?: number; total_attended?: number; unattended_count?: number; participation_rate?: number; participation_rate_label?: string;
  export_links?: { pdf?: string; word?: string; csv?: string };
  notulensi_html?: string | null; kesimpulan_html?: string | null;
  notulensi_raw?: string | null; kesimpulan_raw?: string | null;
  documentations?: Array<{ id: number; agenda_id?: number; url?: string; file_url?: string; caption?: string | null; sort_order?: number; created_at?: string | null; updated_at?: string | null }>;
  attendances?: ApiAttendanceDto[];
  invited_users?: ApiUserDto[];
  report_config?: ApiReportConfig;
  permissions?: {
    can_view_admin?: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_manage_status: boolean;
    can_manage_minutes: boolean;
    can_manage_circular: boolean;
    can_manage_participants?: boolean;
    can_attend: boolean;
    can_export: boolean;
  } | null;
  created_at?: string | null; updated_at?: string | null;
}
export interface ApiAgendaPage extends ApiPaginated<ApiAgendaDto> {
  summary?: {
    status_counts?: ApiAgendaStatusCounts;
  };
}
export interface ApiAttendanceDto {
  id: number; agenda_id: number; user_id: number;
  user?: Pick<ApiUserDto, 'id' | 'name' | 'nip' | 'role' | 'unit' | 'jabatan' | 'pangkat_golongan'> | null;
  agenda?: { id: number; judul_rapat: string; slug?: string; tipe_rapat?: 'hybrid' | 'offline' | 'online'; lokasi_ruang?: string | null; waktu_mulai?: string | null; waktu_selesai?: string | null; nomor_ba?: string | null } | null;
  verification_token?: string | null; receipt?: ApiAttendanceReceiptDto | null; status?: 'belum_hadir';
  signed_at: string | null;
  can_view_biometrics?: boolean; has_selfie?: boolean; has_signature?: boolean;
  selfie_url: string | null; signature_url: string | null; ip_address: string | null; user_agent: string | null;
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
export interface ApiAttendanceHistorySummary {
  total_attended: number;
  total_eligible_agendas: number;
  attendance_rate: number;
  attendance_rate_label: string;
  period_label: string;
}
export interface ApiAttendanceHistoryPage extends ApiPaginated<ApiAttendanceDto> {
  summary: ApiAttendanceHistorySummary;
}
export interface ApiAgendaAttendanceSummary {
  total_invited: number;
  total_attended: number;
  unattended_count: number;
  participation_rate: number;
  participation_rate_label: string;
}
export interface ApiAgendaAttendancePage extends ApiPaginated<ApiAttendanceDto> {
  summary: ApiAgendaAttendanceSummary;
}
export interface ApiActivityLogSummary {
  total_logs: number;
  auth_success: number;
  incident_count: number;
  today_count: number;
  categories: {
    login: number;
    agenda: number;
    presensi: number;
    user: number;
  };
}
export interface ApiActivityLogPage extends ApiPaginated<ApiActivityLogDto> {
  summary: ApiActivityLogSummary;
}
