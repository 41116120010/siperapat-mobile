import { create } from 'zustand';
import { ASN } from '../../domain/entities/types';
import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';

const authRepo = new AuthRepositoryImpl();

interface AuthState {
  user: ASN | null;
  isLoading: boolean;
  error: string | null;
  checkSession: () => Promise<void>;
  login: (nip: string, password?: string) => Promise<boolean>;
  loginBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  checkSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authRepo.getCurrentUser();
      set({ user, isLoading: false });
    } catch (err: unknown) {
      set({
        user: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal memeriksa sesi pengguna',
      });
    }
  },

  login: async (nip: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authRepo.loginWithNIP(nip, password);
      set({ user, isLoading: false });
      return true;
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Autentikasi gagal. Silakan periksa kredensial.',
      });
      return false;
    }
  },

  loginBiometric: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authRepo.loginWithBiometrics();
      set({ user, isLoading: false });
      return true;
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Sensor biometrik gagal memverifikasi.',
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await authRepo.logout();
    set({ user: null, isLoading: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
