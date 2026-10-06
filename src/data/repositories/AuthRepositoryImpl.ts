import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAuthRepository } from '../../domain/repositories/interfaces';
import { ASN } from '../../domain/entities/types';
import { MOCK_ASN_USER } from '../datasources/mockData';
import { isValidNIP } from '../../core/utils/nipValidator';

const AUTH_STORAGE_KEY = '@siperapat_auth_session';

export class AuthRepositoryImpl implements IAuthRepository {
  async loginWithNIP(nip: string, password?: string): Promise<ASN> {
    const cleanNip = nip.replace(/\s+/g, '');
    
    // Validate NIP length or username
    if (!isValidNIP(cleanNip) && cleanNip.toLowerCase() !== 'admin') {
      throw new Error('NIP harus terdiri dari 18 digit angka resmi ASN yang sah.');
    }

    if (!password || password.length < 4) {
      throw new Error('Kata sandi kedinasan minimal 4 karakter.');
    }

    // Match or create valid session
    const user: ASN = {
      ...MOCK_ASN_USER,
      nip: cleanNip === 'admin' ? MOCK_ASN_USER.nip : cleanNip,
    };

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  async loginWithBiometrics(): Promise<ASN> {
    // ponytail: simplifikasi simulasi autentikasi biometrik Android; upgrade ke expo-local-authentication pada rilis hardware device sesungguhnya.
    const user = MOCK_ASN_USER;
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  async getCurrentUser(): Promise<ASN | null> {
    try {
      const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as ASN;
      }
    } catch {
      // Fallback on read error
    }
    return null;
  }

  async updateBiometricsSetting(enabled: boolean): Promise<void> {
    const user = await this.getCurrentUser();
    if (user) {
      const updated = { ...user, biometricEnabled: enabled };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    }
  }
}
