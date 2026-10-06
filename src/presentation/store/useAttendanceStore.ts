import { create } from 'zustand';
import { Attendance, AuditLog, ASNUnitMember } from '../../domain/entities/types';
import { AttendanceRepositoryImpl } from '../../data/repositories/AttendanceRepositoryImpl';

const attendanceRepo = new AttendanceRepositoryImpl();

interface AttendanceState {
  attendances: Attendance[];
  lastReceipt: Attendance | null;
  auditLogs: AuditLog[];
  unitMembers: ASNUnitMember[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  offlineQueueCount: number;

  fetchHistory: (nip?: string) => Promise<void>;
  fetchReceipt: (id: string) => Promise<Attendance | null>;
  submitAttendance: (
    data: Omit<Attendance, 'id' | 'verificationToken' | 'timestamp' | 'isSynced'>
  ) => Promise<Attendance | null>;
  fetchAuditLogs: () => Promise<void>;
  fetchUnitMembers: (unitKerja?: string) => Promise<void>;
  syncOfflineQueue: () => Promise<number>;
  clearError: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendances: [],
  lastReceipt: null,
  auditLogs: [],
  unitMembers: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  offlineQueueCount: 0,

  fetchHistory: async (nip = '') => {
    const hasData = get().attendances.length > 0;
    if (!hasData) {
      set({ isLoading: true, error: null });
    }

    try {
      const attendances = await attendanceRepo.getAttendanceHistory(nip);
      const queue = await attendanceRepo.getOfflineQueue();
      set({
        attendances,
        offlineQueueCount: queue.length,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal memuat riwayat presensi',
      });
    }
  },

  fetchReceipt: async (id: string) => {
    try {
      const receipt = await attendanceRepo.getAttendanceReceipt(id);
      if (receipt) {
        set({ lastReceipt: receipt });
      }
      return receipt;
    } catch {
      return null;
    }
  },

  submitAttendance: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const record = await attendanceRepo.submitAttendance(data);
      set((state) => ({
        attendances: [record, ...state.attendances],
        lastReceipt: record,
        isSubmitting: false,
        error: null,
      }));
      return record;
    } catch (err: unknown) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Gagal mengirim berkas presensi',
      });
      return null;
    }
  },

  fetchAuditLogs: async () => {
    try {
      const logs = await attendanceRepo.getAuditLogs();
      set({ auditLogs: logs });
    } catch {
      // Fallback
    }
  },

  fetchUnitMembers: async (unitKerja) => {
    try {
      const members = await attendanceRepo.getUnitMembers(unitKerja);
      set({ unitMembers: members });
    } catch {
      // Fallback
    }
  },

  syncOfflineQueue: async () => {
    try {
      const count = await attendanceRepo.syncOfflineQueue();
      const queue = await attendanceRepo.getOfflineQueue();
      set({ offlineQueueCount: queue.length });
      return count;
    } catch {
      return 0;
    }
  },

  clearError: () => set({ error: null }),
}));
