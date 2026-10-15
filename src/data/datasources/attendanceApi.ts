import { apiClient } from './apiClient';
import { ApiAgendaDto, ApiAttendanceDto, ApiEnvelope, ApiPaginated } from './apiTypes';

export interface AttendancePortalDto { agenda: ApiAgendaDto; is_ongoing: boolean; is_eligible: boolean; has_attended: boolean; my_attendance: ApiAttendanceDto | null }
export const attendanceApi = {
  portal: (agendaId: string) => apiClient.get<ApiEnvelope<AttendancePortalDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendance-portal`),
  myHistory: (page = 1, perPage = 15) => apiClient.get<ApiPaginated<ApiAttendanceDto>>(`/attendances/my-history?page=${page}&per_page=${perPage}`),
  agendaAttendances: (agendaId: string, page = 1, perPage = 50) => apiClient.get<ApiPaginated<ApiAttendanceDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendances?page=${page}&per_page=${perPage}`),
  submit: (agendaId: string, payload: { selfie_data?: string; signature_data?: string; selfie_file?: unknown; signature_file?: unknown }) => apiClient.post<ApiEnvelope<ApiAttendanceDto>>(`/agendas/${encodeURIComponent(agendaId)}/attendances`, payload),
};
