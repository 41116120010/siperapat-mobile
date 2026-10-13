import { ASN } from '../../domain/entities/types';
import { ApiError } from '../datasources/apiClient';
import { authApi, ApiUserDto } from '../datasources/authApi';
import { authTokenStore } from '../datasources/authTokenStore';
import { IAuthRepository } from '../../domain/repositories/interfaces';

function toAppUser(user: ApiUserDto): ASN {
  return {
    id: String(user.id),
    nip: user.nip ?? '',
    name: user.name,
    email: user.email ?? '',
    phone: user.phone ?? '',
    avatarUrl: user.avatar_url ?? undefined,
    username: user.username ?? undefined,
    unitKerja: user.unit?.nama_unit ?? '',
    // The current UserResource does not expose rank or job title.
    pangkatGolongan: undefined,
    jabatan: undefined,
    biometricEnabled: false,
  };
}

export class AuthRepositoryImpl implements IAuthRepository {
  async loginWithNIP(identifier: string, password: string): Promise<ASN> {
    if (!identifier.trim() || !password) {
      throw new Error('Masukkan NIP atau username dan kata sandi.');
    }

    const response = await authApi.login(identifier, password);
    if (!response.success || !response.data?.token) {
      throw new Error(response.message || 'Autentikasi gagal.');
    }

    await authTokenStore.set(response.data.token);
    return toAppUser(response.data.user);
  }

  async loginWithBiometrics(): Promise<ASN> {
    throw new Error('Login biometrik belum tersedia. Silakan gunakan NIP atau username.');
  }

  async logout(): Promise<void> {
    try {
      if (await authTokenStore.get()) await authApi.logout();
    } catch (error) {
      // Local credentials must be removed even when the server cannot be reached.
      // A revoked/expired token is already invalid and is treated as logged out.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    } finally {
      await authTokenStore.clear();
    }
  }

  async getCurrentUser(): Promise<ASN | null> {
    if (!(await authTokenStore.get())) return null;

    const response = await authApi.me();
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Gagal memeriksa sesi pengguna.');
    }
    return toAppUser(response.data);
  }

  async updateBiometricsSetting(_enabled: boolean): Promise<void> {
    // Biometric unlock is not part of the current Laravel authentication API.
  }

  async changePassword(_currentPassword: string, _newPassword: string): Promise<boolean> {
    throw new Error('Perubahan kata sandi belum diintegrasikan pada tahap ini.');
  }
}
