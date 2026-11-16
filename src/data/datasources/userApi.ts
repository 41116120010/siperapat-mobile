import { apiClient } from './apiClient';
import { ApiActivityLogPage, ApiCandidateList, ApiEnvelope, ApiPaginated, ApiUnitDto, ApiUserDto, CreateUserPayload } from './apiTypes';

export interface ApiUsersSummary {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_users: number;
  staff_users: number;
  active_units: number;
  attendance_rate: number;
  attendance_rate_label: string;
  attendance_rate_subtext: string;
}

export interface ApiUsersPage extends ApiPaginated<ApiUserDto> {
  summary?: ApiUsersSummary;
}

export interface ApiUnitsSummary {
  total_units: number;
  active_units: number;
  inactive_units: number;
  total_users_assigned: number;
}

export type ApiUnitRecord = ApiUnitDto & {
  created_at?: string | null;
  updated_at?: string | null;
};

export interface ApiUnitsPage extends ApiPaginated<ApiUnitRecord> {
  summary?: ApiUnitsSummary;
}

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}

export const userApi = {
  /** GET /users/candidates — cross-unit active ASN candidates for agenda targeting. */
  candidates: (filters: { search?: string; unitId?: number; includeInactive?: boolean } = {}) =>
    apiClient.get<ApiCandidateList<ApiUserDto>>(
      `/users/candidates?${query({
        search: filters.search,
        unit_id: filters.unitId,
        include_inactive: filters.includeInactive ? 1 : undefined,
      })}`,
    ),
  users: (page = 1, filters: { search?: string; role?: string; status?: string; unitId?: number | string; perPage?: number } = {}) =>
    apiClient.get<ApiUsersPage>(`/users?${query({ page, per_page: filters.perPage ?? 10, search: filters.search, role: filters.role, status: filters.status, unit_id: filters.unitId })}`),
  user: (id: string, options: { withStats?: boolean } = {}) =>
    apiClient.get<ApiEnvelope<ApiUserDto>>(`/users/${encodeURIComponent(id)}${options.withStats ? '?with_stats=1' : ''}`),
  create: (payload: Omit<CreateUserPayload, 'unit_id'> & { unit_id?: number | null }) =>
    apiClient.post<ApiEnvelope<ApiUserDto>>('/users', payload),
  update: (id: string, payload: Record<string, unknown>) => apiClient.put<ApiEnvelope<ApiUserDto>>(`/users/${encodeURIComponent(id)}`, payload),
  remove: (id: string) => apiClient.delete<ApiEnvelope<never>>(`/users/${encodeURIComponent(id)}`),
  toggleStatus: (id: string) => apiClient.patch<ApiEnvelope<ApiUserDto>>(`/users/${encodeURIComponent(id)}/toggle-status`),
  units: (page = 1, search?: string, perPage = 10, options: { status?: string; all?: boolean } = {}) =>
    apiClient.get<ApiUnitsPage>(
      `/units?${query({
        page: options.all ? undefined : page,
        per_page: options.all ? undefined : perPage,
        search,
        status: options.status,
        all: options.all ? 1 : undefined,
      })}`,
    ),
  unit: (id: number | string) => apiClient.get<ApiEnvelope<ApiUnitRecord>>(`/units/${encodeURIComponent(id)}`),
  createUnit: (payload: { kode_unit: string; nama_unit: string; deskripsi?: string | null; is_active?: boolean }) =>
    apiClient.post<ApiEnvelope<ApiUnitRecord>>('/units', payload),
  updateUnit: (id: number | string, payload: { kode_unit?: string; nama_unit?: string; deskripsi?: string | null; is_active?: boolean }) =>
    apiClient.put<ApiEnvelope<ApiUnitRecord>>(`/units/${encodeURIComponent(id)}`, payload),
  deleteUnit: (id: number | string) =>
    apiClient.delete<ApiEnvelope<never>>(`/units/${encodeURIComponent(id)}`),
  toggleUnitStatus: (id: number | string) =>
    apiClient.patch<ApiEnvelope<ApiUnitRecord>>(`/units/${encodeURIComponent(id)}/toggle-status`),
};

export const activityLogApi = {
  personal: (
    page = 1,
    search?: string,
    perPage = 10,
    filters: { category?: string; startDate?: string; endDate?: string; userId?: number | string; type?: string } = {}
  ) =>
    apiClient.get<ApiActivityLogPage>(
      `/profile/logs?${query({
        page,
        per_page: perPage,
        search,
        category: filters.category,
        start_date: filters.startDate,
        end_date: filters.endDate,
        user_id: filters.userId,
        type: filters.type,
      })}`
    ),
  system: (
    page = 1,
    search?: string,
    perPage = 10,
    filters: { category?: string; startDate?: string; endDate?: string; userId?: number | string; type?: string } = {}
  ) =>
    apiClient.get<ApiActivityLogPage>(
      `/activity-logs?${query({
        page,
        per_page: perPage,
        search,
        category: filters.category,
        start_date: filters.startDate,
        end_date: filters.endDate,
        user_id: filters.userId,
        type: filters.type,
      })}`
    ),
};
