import { apiClient } from './apiClient';

export interface ApiUnitDto {
  id: number;
  nama_unit: string;
  kode_unit: string;
  deskripsi: string | null;
  is_active: boolean;
}

export interface ApiUserDto {
  id: number;
  name: string;
  nip: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: { value: string; label: string };
  is_active: boolean;
  unit_id: number | null;
  unit?: ApiUnitDto | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiMessageDto {
  success: boolean;
  message: string;
}

export interface LoginResponseDto {
  token: string;
  token_type: 'Bearer';
  expires_in_days: number;
  user: ApiUserDto;
}

export const authApi = {
  login: (identifier: string, password: string) =>
    apiClient.post<ApiEnvelope<LoginResponseDto>>(
      '/auth/login',
      { login: identifier.trim(), password, device_name: 'SIPERAPAT Mobile' },
      { authenticated: false }
    ),

  me: () => apiClient.get<ApiEnvelope<ApiUserDto>>('/auth/me'),

  logout: () => apiClient.post<ApiMessageDto>('/auth/logout'),
};
