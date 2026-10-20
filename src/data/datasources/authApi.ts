import { apiClient } from './apiClient';
import { ApiEnvelope, ApiUserDto } from './apiTypes';

export interface ApiLoginDto { token: string; token_type: 'Bearer'; expires_in_days: number; user: ApiUserDto }
export interface ApiPasswordChangeDto extends ApiLoginDto {}
export const authApi = {
  login: (identifier: string, password: string, deviceName: string) => apiClient.post<ApiEnvelope<ApiLoginDto>>('/auth/login', { login: identifier, password, device_name: deviceName }, { authenticated: false }),
  me: () => apiClient.get<ApiEnvelope<ApiUserDto>>('/auth/me'),
  logout: () => apiClient.post<{ success: boolean; message: string }>('/auth/logout'),
  changePassword: (payload: { current_password: string; password: string; password_confirmation: string; device_name: string }) =>
    apiClient.put<ApiEnvelope<ApiPasswordChangeDto>>('/profile/password', payload),
};
