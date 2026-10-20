import { apiClient } from './apiClient';
import { ApiActivityLogPage, ApiEnvelope, ApiPaginated, ApiUnitDto, ApiUserDto } from './apiTypes';

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}

export const userApi = {
  users: (page = 1, filters: { search?: string; role?: string; status?: string; unitId?: number; perPage?: number } = {}) =>
    apiClient.get<ApiPaginated<ApiUserDto>>(`/users?${query({ page, per_page: filters.perPage ?? 10, search: filters.search, role: filters.role, status: filters.status, unit_id: filters.unitId })}`),
  user: (id: string) => apiClient.get<ApiEnvelope<ApiUserDto>>(`/users/${encodeURIComponent(id)}`),
  create: (payload: Record<string, unknown>) => apiClient.post<ApiEnvelope<ApiUserDto>>('/users', payload),
  update: (id: string, payload: Record<string, unknown>) => apiClient.put<ApiEnvelope<ApiUserDto>>(`/users/${encodeURIComponent(id)}`, payload),
  remove: (id: string) => apiClient.delete<ApiEnvelope<never>>(`/users/${encodeURIComponent(id)}`),
  toggleStatus: (id: string) => apiClient.patch<ApiEnvelope<ApiUserDto>>(`/users/${encodeURIComponent(id)}/toggle-status`),
  units: (page = 1, search?: string, perPage = 10) => apiClient.get<ApiPaginated<ApiUnitDto>>(`/units?${query({ page, per_page: perPage, search })}`),
  unit: (id: number | string) => apiClient.get<ApiEnvelope<ApiUnitDto>>(`/units/${encodeURIComponent(id)}`),
  createUnit: (payload: { kode_unit: string; nama_unit: string; deskripsi?: string | null; is_active?: boolean }) =>
    apiClient.post<ApiEnvelope<ApiUnitDto>>('/units', payload),
  updateUnit: (id: number | string, payload: { kode_unit?: string; nama_unit?: string; deskripsi?: string | null; is_active?: boolean }) =>
    apiClient.put<ApiEnvelope<ApiUnitDto>>(`/units/${encodeURIComponent(id)}`, payload),
  deleteUnit: (id: number | string) =>
    apiClient.delete<ApiEnvelope<never>>(`/units/${encodeURIComponent(id)}`),
};

export const activityLogApi = {
  personal: (page = 1, search?: string, perPage = 10, filters: { category?: string; startDate?: string; endDate?: string } = {}) => apiClient.get<ApiActivityLogPage>(`/profile/logs?${query({ page, per_page: perPage, search, category: filters.category, start_date: filters.startDate, end_date: filters.endDate })}`),
  system: (page = 1, search?: string, perPage = 10, filters: { category?: string; startDate?: string; endDate?: string } = {}) => apiClient.get<ApiActivityLogPage>(`/activity-logs?${query({ page, per_page: perPage, search, category: filters.category, start_date: filters.startDate, end_date: filters.endDate })}`),
};
