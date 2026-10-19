import { apiClient } from './apiClient';
import { ApiActivityLogDto, ApiEnvelope, ApiPaginated, ApiUnitDto, ApiUserDto } from './apiTypes';

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
};

export const activityLogApi = {
  personal: (page = 1, search?: string, perPage = 10) => apiClient.get<ApiPaginated<ApiActivityLogDto>>(`/profile/logs?${query({ page, per_page: perPage, search })}`),
  system: (page = 1, search?: string, perPage = 10) => apiClient.get<ApiPaginated<ApiActivityLogDto>>(`/activity-logs?${query({ page, per_page: perPage, search })}`),
};
