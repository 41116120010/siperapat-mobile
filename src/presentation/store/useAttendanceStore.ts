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
  isLoading: boolean; isSubmitting: boolean; error: string | null;
  fetchHistory: (page?: number, append?: boolean, filters?: { search?: string; period?: string; tipeRapat?: string }) => Promise<void>; fetchAgendaAttendances: (agendaId: string, page?: number, append?: boolean, filters?: { status?: 'attended' | 'unattended'; search?: string }) => Promise<void>;
  fetchPortal: (agendaId: string) => Promise<void>; fetchReceipt: (id: string) => Promise<Attendance | null>;
  submitAttendance: (agendaId: string, payload: { selfie_data?: string; signature_data?: string }) => Promise<Attendance | null>;
  reset: () => void; clearError: () => void;
}

const INITIAL_ATTENDANCE_STATE = {
  attendances: [] as Attendance[],
  lastReceipt: null as Attendance | null,
  historyPage: null as AttendancePage | null,
  agendaAttendances: [] as Attendance[],
  agendaAttendancePage: null as AgendaAttendancePage | null,
  portal: null as AttendancePortal | null,
  historySummary: null as AttendancePage['summary'] | null,
  isLoading: false,
  isSubmitting: false,
  error: null as string | null,
};

function errorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  ...INITIAL_ATTENDANCE_STATE,

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
    } catch (error) { set({ error: errorMessage(error, 'Gagal memuat riwayat presensi.') }); }
    finally { set({ isLoading: false }); }
  },

  fetchAgendaAttendances: async (agendaId, page = 1, append = false, filters = {}) => {
    set(append ? { isLoading: true, error: null } : { isLoading: true, error: null, agendaAttendances: [], agendaAttendancePage: null });
    try {
      const result = await attendanceRepo.getAgendaAttendances(agendaId, page, 10, filters);
      set((state) => ({ agendaAttendances: append ? [...state.agendaAttendances, ...result.records] : result.records, agendaAttendancePage: result }));
    } catch (error) { set({ error: errorMessage(error, 'Gagal memuat daftar kehadiran agenda.') }); }
    finally { set({ isLoading: false }); }
  },

  fetchReceipt: async (id) => {
    try {
      const record = await attendanceRepo.getAttendanceReceipt(id);
      if (record) {
        const currentLast = get().lastReceipt;
        const merged: Attendance = {
          ...record,
          selfieUri: (currentLast?.id === id && currentLast.selfieUri) ? currentLast.selfieUri : record.selfieUri,
          signatureSvg: (currentLast?.id === id && currentLast.signatureSvg) ? currentLast.signatureSvg : record.signatureSvg,
        };
        set({ lastReceipt: merged });
        return merged;
      }
      return null;
    } catch (error) { set({ error: errorMessage(error, 'Gagal memuat tanda terima presensi.') }); return null; }
  },

  submitAttendance: async (agendaId, payload) => {
    if (get().isSubmitting || get().portal?.hasAttended) return null;
    set({ isSubmitting: true, error: null });
    try {
      const record = await attendanceRepo.submitAttendance(agendaId, payload);
      const richRecord: Attendance = {
        ...record,
        selfieUri: payload.selfie_data || record.selfieUri,
        signatureSvg: payload.signature_data || record.signatureSvg,
      };
      set({ lastReceipt: richRecord, portal: get().portal ? { ...get().portal!, hasAttended: true, attendance: richRecord } : null });
      void get().fetchHistory(1);
      return richRecord;
    } catch (error) { set({ error: errorMessage(error, 'Gagal mengirim presensi.') }); return null; }
    finally { set({ isSubmitting: false }); }
  },

  reset: () => set(INITIAL_ATTENDANCE_STATE),
  clearError: () => set({ error: null }),
}));
