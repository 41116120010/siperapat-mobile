import { apiClient } from './apiClient';
import { ApiAgendaDto, ApiAttendanceDto, ApiAttendancePage, ApiEnvelope } from './apiTypes';

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}

export interface AttendancePortalDto { agenda: ApiAgendaDto; is_ongoing: boolean; is_eligible: boolean; has_attended: boolean; my_attendance: ApiAttendanceDto | null }
export const attendanceApi = {
  portal: (agendaId: string) => apiClient.get<ApiEnvelope<AttendancePortalDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendance-portal`),
  myHistory: (page = 1, perPage = 10, filters: { search?: string; period?: string; startDate?: string; endDate?: string; tipeRapat?: string } = {}) =>
    apiClient.get<ApiAttendancePage>(`/attendances/my-history?${query({ page, per_page: perPage, search: filters.search, period: filters.period, start_date: filters.startDate, end_date: filters.endDate, tipe_rapat: filters.tipeRapat })}`),
  agendaAttendances: (agendaId: string, page = 1, perPage = 50, filters: { status?: 'attended' | 'unattended'; search?: string } = {}) =>
    apiClient.get<ApiAttendancePage>(`/agendas/${encodeURIComponent(agendaId)}/attendances?${query({ page, per_page: perPage, status: filters.status, search: filters.search })}`),
  receipt: (attendanceId: string) => apiClient.get<ApiEnvelope<ApiAttendanceDto>>(`/attendances/${encodeURIComponent(attendanceId)}/receipt`),
  submit: (agendaId: string, payload: { selfie_data?: string; signature_data?: string; selfie_file?: unknown; signature_file?: unknown }) => apiClient.post<ApiEnvelope<ApiAttendanceDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendances`, payload),
};
