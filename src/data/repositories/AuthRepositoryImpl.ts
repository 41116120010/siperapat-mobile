import { IAuthRepository } from '../../domain/repositories/interfaces';
import { ASN } from '../../domain/entities/types';
import { authTokenStore } from '../datasources/authTokenStore';
import { authApi } from '../datasources/authApi';
import { toAsn } from '../mappers/apiMappers';

export class AuthRepositoryImpl implements IAuthRepository {
  async loginWithNIP(identifier: string, password: string, remember = true): Promise<ASN> {
    const response = await authApi.login(identifier.trim(), password, 'SIPERAPAT Mobile');
    if (!response.success) throw new Error(response.message || 'Autentikasi gagal.');
    await authTokenStore.set(response.data.token, remember);
    return toAsn(response.data.user);
  }

  async loginWithBiometrics(): Promise<ASN> {
    throw new Error('Login biometrik belum didukung oleh API autentikasi.');
  }

  async logout(): Promise<void> {
    try { if (await authTokenStore.get()) await authApi.logout(); }
    finally { await authTokenStore.clear(); }
  }

  async getCurrentUser(): Promise<ASN | null> {
    if (!(await authTokenStore.get())) return null;
    try {
      const response = await authApi.me();
      if (!response.success) throw new Error(response.message || 'Sesi tidak dapat divalidasi.');
      return toAsn(response.data);
    } catch (error) {
      if ((error as { status?: number })?.status === 401) await authTokenStore.clear();
      throw error;
    }
  }

  async updateBiometricsSetting(_enabled: boolean): Promise<void> {
    throw new Error('Pengaturan biometrik belum didukung oleh API.');
  }

  async changePassword(_currentPassword: string, _newPassword: string): Promise<boolean> {
    throw new Error('Perubahan kata sandi belum didukung oleh endpoint API yang tersedia.');
  }
}
