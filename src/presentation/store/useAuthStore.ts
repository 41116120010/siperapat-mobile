import { create } from 'zustand';
import { clearAllAuthMediaCaches } from '../../core/utils/authenticatedMediaCache';
import { ASN } from '../../domain/entities/types';
import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';
import { authTokenStore } from '../../data/datasources/authTokenStore';
import { useAttendanceStore } from './useAttendanceStore';
import { useEmployeeStore } from './useEmployeeStore';
import { useMeetingStore } from './useMeetingStore';

const authRepo = new AuthRepositoryImpl();

function resetAllSessionData(): void {
  void clearAllAuthMediaCaches();
  useMeetingStore.getState().reset();
  useEmployeeStore.getState().reset();
  useAttendanceStore.getState().reset();
}

interface AuthState {
  user: ASN | null;
  isLoading: boolean;
  error: string | null;
  checkSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  login: (nip: string, password: string, remember?: boolean) => Promise<boolean>;
  loginBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (
    payload: { phone?: string; name?: string; email?: string }
  ) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (
    identity: string
  ) => Promise<{ success: boolean; message: string; maskedEmail?: string }>;
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

  refreshProfile: async () => {
    try {
      const user = await authRepo.getCurrentUser();
      if (user) set({ user });
    } catch {
      // Keep the current profile visible when a refresh fails; do not replace it with mock data.
    }
  },

  login: async (nip: string, password: string, remember = true) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authRepo.loginWithNIP(nip, password, remember);
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
    try { await authRepo.logout(); }
    finally {
      resetAllSessionData();
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

  updateProfile: async (payload: { phone?: string; name?: string; email?: string }) => {
    set({ error: null });
    try {
      const updatedUser = await authRepo.updateProfile(payload);
      set({ user: updatedUser });
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal memperbarui profil pengguna.';
      set({ error: message });
      return { success: false, message };
    }
  },

  forgotPassword: async (identity: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authRepo.forgotPassword(identity);
      if (result.success) {
        set({ isLoading: false });
        return { success: result.success, message: result.message, maskedEmail: result.maskedEmail };
      } else {
        set({ isLoading: false, error: result.message });
        return { success: result.success, message: result.message, maskedEmail: result.maskedEmail };
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal meminta pemulihan kata sandi.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  clearError: () => set({ error: null }),
}));

authTokenStore.setUnauthorizedHandler(() => {
  resetAllSessionData();
  useAuthStore.setState({ user: null, isLoading: false, error: 'Sesi berakhir. Silakan masuk kembali.' });
});
