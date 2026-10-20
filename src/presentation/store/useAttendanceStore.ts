import { create } from 'zustand';
import { Attendance } from '../../domain/entities/types';
import { AttendanceRepositoryImpl } from '../../data/repositories/AttendanceRepositoryImpl';

const attendanceRepo = new AttendanceRepositoryImpl();
type AttendancePortal = Awaited<ReturnType<typeof attendanceRepo.getAttendancePortal>>;
type AttendancePage = Awaited<ReturnType<typeof attendanceRepo.getAttendanceHistory>>;
type AgendaAttendancePage = Awaited<ReturnType<typeof attendanceRepo.getAgendaAttendances>>;

interface AttendanceState {
  attendances: Attendance[]; lastReceipt: Attendance | null; historyPage: AttendancePage | null;
  agendaAttendances: Attendance[]; agendaAttendancePage: AgendaAttendancePage | null; portal: AttendancePortal | null; historySummary: AttendancePage['summary'] | null;
  isLoading: boolean; isSubmitting: boolean; error: string | null; offlineQueueCount: number;
  fetchHistory: (page?: number, append?: boolean, filters?: { search?: string; period?: string; tipeRapat?: string }) => Promise<void>; fetchAgendaAttendances: (agendaId: string, page?: number, append?: boolean, filters?: { status?: 'attended' | 'unattended'; search?: string }) => Promise<void>;
  fetchPortal: (agendaId: string) => Promise<void>; fetchReceipt: (id: string) => Promise<Attendance | null>;
  submitAttendance: (agendaId: string, payload: { selfie_data?: string; signature_data?: string }) => Promise<Attendance | null>;
  syncOfflineQueue: () => Promise<number>; clearError: () => void;
}

function errorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendances: [], lastReceipt: null, historyPage: null, agendaAttendances: [], agendaAttendancePage: null, portal: null, historySummary: null,
  isLoading: false, isSubmitting: false, error: null, offlineQueueCount: 0,

  fetchPortal: async (agendaId) => {
    set({ isLoading: true, error: null });
    try { set({ portal: await attendanceRepo.getAttendancePortal(agendaId) }); }
    catch (error) { set({ error: errorMessage(error, 'Gagal memuat portal presensi.') }); }
    finally { set({ isLoading: false }); }
  },

  fetchHistory: async (page = 1, append = false, filters = {}) => {
    set(append ? { isLoading: true, error: null } : { isLoading: true, error: null, attendances: [], historyPage: null, historySummary: null });
    try {
      const result = await attendanceRepo.getAttendanceHistory(page, 10, filters);
      set((state) => ({ attendances: append ? [...state.attendances, ...result.records] : result.records, historyPage: result, historySummary: result.summary }));
      const queue = await attendanceRepo.getOfflineQueue();
      set({ offlineQueueCount: queue.length });
    } catch (error) { set({ error: errorMessage(error, 'Gagal memuat riwayat presensi.') }); }
    finally { set({ isLoading: false }); }
  },

  fetchAgendaAttendances: async (agendaId, page = 1, append = false, filters = {}) => {
    set(append ? { isLoading: true, error: null } : { isLoading: true, error: null, agendaAttendances: [], agendaAttendancePage: null });
    try {
      const result = await attendanceRepo.getAgendaAttendances(agendaId, page, 50, filters);
      set((state) => ({ agendaAttendances: append ? [...state.agendaAttendances, ...result.records] : result.records, agendaAttendancePage: result }));
    } catch (error) { set({ error: errorMessage(error, 'Gagal memuat daftar kehadiran agenda.') }); }
    finally { set({ isLoading: false }); }
  },

  fetchReceipt: async (id) => {
    try {
      const record = await attendanceRepo.getAttendanceReceipt(id);
      if (record) set({ lastReceipt: record });
      return record;
    } catch (error) { set({ error: errorMessage(error, 'Gagal memuat tanda terima presensi.') }); return null; }
  },

  submitAttendance: async (agendaId, payload) => {
    if (get().isSubmitting || get().portal?.hasAttended) return null;
    set({ isSubmitting: true, error: null });
    try {
      const record = await attendanceRepo.submitAttendance(agendaId, payload);
      set({ lastReceipt: record, portal: get().portal ? { ...get().portal!, hasAttended: true, attendance: record } : null });
      await get().fetchHistory(1);
      return record;
    } catch (error) { set({ error: errorMessage(error, 'Gagal mengirim presensi.') }); return null; }
    finally { set({ isSubmitting: false }); }
  },

  syncOfflineQueue: async () => { try { const count = await attendanceRepo.syncOfflineQueue(); set({ offlineQueueCount: (await attendanceRepo.getOfflineQueue()).length }); return count; } catch { return 0; } },
  clearError: () => set({ error: null }),
}));
