import { ApiEnvelope } from './authApi';
import { apiClient } from './apiClient';
import { ApiAgendaDto, ApiPaginated } from './agendaApi';

export interface ApiAttendanceDto {
  id: number;
  agenda_id: number;
  user_id: number;
  user?: { id: number; name: string; nip: string | null; role?: { value: string; label: string }; unit?: { nama_unit: string } | null } | null;
  signed_at: string | null;
  selfie_url: string | null;
  signature_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AttendancePortalDto {
  agenda: ApiAgendaDto;
  is_ongoing: boolean;
  is_eligible: boolean;
  has_attended: boolean;
  my_attendance: ApiAttendanceDto | null;
}

export const attendanceApi = {
  portal: (agendaId: string) => apiClient.get<ApiEnvelope<AttendancePortalDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendance-portal`),
  myHistory: (page = 1, perPage = 50) => apiClient.get<ApiPaginated<ApiAttendanceDto>>(`/attendances/my-history?page=${page}&per_page=${perPage}`),
  agendaAttendances: (agendaId: string, page = 1, perPage = 50) => apiClient.get<ApiPaginated<ApiAttendanceDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendances?page=${page}&per_page=${perPage}`),
  submit: (agendaId: string, payload: { selfie_data: string; signature_data: string }) => apiClient.post<ApiEnvelope<ApiAttendanceDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendances`, payload),
};
