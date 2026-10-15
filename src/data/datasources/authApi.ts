import { apiClient } from './apiClient';
import { ApiEnvelope, ApiUserDto } from './apiTypes';

export interface ApiLoginDto { token: string; token_type: 'Bearer'; expires_in_days: number; user: ApiUserDto }
export const authApi = {
  login: (identifier: string, password: string, deviceName: string) => apiClient.post<ApiEnvelope<ApiLoginDto>>('/auth/login', { login: identifier, password, device_name: deviceName }, { authenticated: false }),
  me: () => apiClient.get<ApiEnvelope<ApiUserDto>>('/auth/me'),
  logout: () => apiClient.post<{ success: boolean; message: string }>('/auth/logout'),
};
