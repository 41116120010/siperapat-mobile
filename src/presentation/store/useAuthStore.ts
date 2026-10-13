import { create } from 'zustand';
import { ASN } from '../../domain/entities/types';
import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';

const authRepo = new AuthRepositoryImpl();

interface AuthState {
  user: ASN | null;
  isLoading: boolean;
  error: string | null;
  checkSession: () => Promise<boolean>;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
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
      return Boolean(user);
    } catch (err: unknown) {
      set({
        user: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal memeriksa sesi pengguna',
      });
      return false;
    }
  },

  login: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authRepo.loginWithNIP(identifier, password);
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

  logout: async () => {
    set({ isLoading: true });
    try {
      await authRepo.logout();
      set({ user: null, isLoading: false, error: null });
    } catch {
      set({ user: null, isLoading: false, error: null });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      await authRepo.changePassword(currentPassword, newPassword);
      set({ isLoading: false });
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal memperbarui kata sandi.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  clearError: () => set({ error: null }),
}));
