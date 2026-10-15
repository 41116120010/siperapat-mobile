import { create } from 'zustand';
import { Attendance, AttendancePage, AttendanceRecord, AuditLog, ASNUnitMember } from '../../domain/entities/types';
import { AttendancePortalDto } from '../../data/datasources/attendanceApi';
import { AttendanceRepositoryImpl } from '../../data/repositories/AttendanceRepositoryImpl';

const attendanceRepo = new AttendanceRepositoryImpl();

interface AttendanceState {
  attendances: Attendance[];
  lastReceipt: AttendanceRecord | null;
  auditLogs: AuditLog[];
  unitMembers: ASNUnitMember[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  offlineQueueCount: number;
  portal: AttendancePortalDto | null;
  historyRecords: AttendanceRecord[];
  historyPage: AttendancePage | null;
  agendaRecords: AttendanceRecord[];
  agendaPage: AttendancePage | null;

  fetchMyHistory: (page?: number, append?: boolean) => Promise<void>;
  fetchPortal: (agendaId: string) => Promise<void>;
  fetchAgendaAttendances: (agendaId: string, page?: number, append?: boolean) => Promise<void>;
  submitApiAttendance: (agendaId: string, payload: { selfie_data: string; signature_data: string }) => Promise<AttendanceRecord | null>;
  fetchReceipt: (id: string) => Promise<AttendanceRecord | null>;
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
  portal: null,
  historyRecords: [],
  historyPage: null,
  agendaRecords: [],
  agendaPage: null,

  fetchPortal: async (agendaId) => {
    set({ isLoading: true, error: null });
    try { set({ portal: await attendanceRepo.getPortal(agendaId), isLoading: false }); }
    catch (err: unknown) { set({ isLoading: false, error: err instanceof Error ? err.message : 'Gagal memuat portal presensi.' }); }
  },

  fetchMyHistory: async (page = 1, append = false) => {
    set({ isLoading: true, error: null });
    try {
      const result = await attendanceRepo.getMyHistory(page);
      set((state) => ({ historyRecords: append ? [...state.historyRecords, ...result.records] : result.records, historyPage: result, isLoading: false }));
    } catch (err: unknown) { set({ isLoading: false, error: err instanceof Error ? err.message : 'Gagal memuat riwayat presensi.' }); }
  },

  fetchAgendaAttendances: async (agendaId, page = 1, append = false) => {
    set({ isLoading: true, error: null });
    try {
      const result = await attendanceRepo.getAgendaAttendances(agendaId, page);
      set((state) => ({ agendaRecords: append ? [...state.agendaRecords, ...result.records] : result.records, agendaPage: result, isLoading: false }));
    } catch (err: unknown) { set({ isLoading: false, error: err instanceof Error ? err.message : 'Gagal memuat daftar kehadiran.' }); }
  },

  submitApiAttendance: async (agendaId, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const record = await attendanceRepo.submitApiAttendance(agendaId, payload);
      set({ isSubmitting: false, lastReceipt: null });
      return record;
    } catch (err: unknown) {
      set({ isSubmitting: false, error: err instanceof Error ? err.message : 'Gagal mengirim presensi.' });
      return null;
    }
  },

  fetchReceipt: async (id: string) => {
    try {
      const cached = get().historyRecords.find((record) => record.id === id);
      if (cached) { set({ lastReceipt: cached }); return cached; }
      let page = 1;
      let lastPage = 1;
      do {
        const result = await attendanceRepo.getMyHistory(page);
        const record = result.records.find((item) => item.id === id);
        if (record) { set({ lastReceipt: record }); return record; }
        lastPage = result.lastPage;
        page += 1;
      } while (page <= lastPage);
      return null;
    } catch {
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
