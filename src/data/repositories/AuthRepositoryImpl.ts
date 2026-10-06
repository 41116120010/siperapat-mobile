import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAuthRepository } from '../../domain/repositories/interfaces';
import { ASN } from '../../domain/entities/types';
import { MOCK_ASN_USER } from '../datasources/mockData';
import { isValidNIP } from '../../core/utils/nipValidator';

const AUTH_STORAGE_KEY = '@siperapat_auth_session';

export class AuthRepositoryImpl implements IAuthRepository {
  async loginWithNIP(identifier: string, password?: string): Promise<ASN> {
    const trimmed = identifier.trim();
    const cleanDigits = trimmed.replace(/\s+/g, '');
    const isNumeric = /^\d+$/.test(cleanDigits);

    // Validate NIP length (18 digit) or username (min 3 chars)
    if (isNumeric) {
      if (!isValidNIP(cleanDigits)) {
        throw new Error('NIP harus terdiri dari 18 digit angka resmi ASN yang sah.');
      }
    } else {
      if (trimmed.length < 3) {
        throw new Error('Username ASN terdaftar minimal 3 karakter.');
      }
    }

    if (!password || password.length < 4) {
      throw new Error('Kata sandi kedinasan minimal 4 karakter.');
    }

    // Match or create valid session
    const user: ASN = {
      ...MOCK_ASN_USER,
      nip: isNumeric ? cleanDigits : MOCK_ASN_USER.nip,
      username: !isNumeric ? trimmed : 'afdalisma',
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
