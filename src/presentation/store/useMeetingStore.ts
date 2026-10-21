import { create } from 'zustand';
import { Meeting } from '../../domain/entities/types';
import { AgendaFilters, CreateAgendaDto, UpdateAgendaDto, UpdateMinutesDto, UploadFileRef } from '../../data/datasources/agendaApi';
import { ApiDashboardDto, ApiUnitDto, ApiUserDto } from '../../data/datasources/apiTypes';
import { MeetingRepositoryImpl } from '../../data/repositories/MeetingRepositoryImpl';

const repository = new MeetingRepositoryImpl();
type FilterTab = 'all' | 'ongoing' | 'upcoming' | 'completed';
interface MeetingState {
  meetings: Meeting[]; dashboardMeetings: Meeting[]; dashboardStats: ApiDashboardDto['stats'] | null;
  activeMeeting: Meeting | null; isLoading: boolean; isLoadingMore: boolean; error: string | null;
  isSavingMinutes: boolean;
  filterTab: FilterTab; currentPage: number; lastPage: number; total: number; typeFilter: 'hybrid' | 'offline' | 'online' | undefined;
  formOptions: { users: ApiUserDto[]; units: ApiUnitDto[] } | null; isFormOptionsLoading: boolean;
  setFilterTab: (tab: FilterTab) => void; fetchDashboard: () => Promise<void>;
  fetchMeetings: (page?: number, append?: boolean, typeFilter?: 'all' | 'hybrid' | 'offline' | 'online') => Promise<void>;
  getMeetingById: (id: string) => Promise<Meeting>;
  updateMinutes: (id: string, minutes: UpdateMinutesDto) => Promise<Meeting | null>;
  uploadSuratEdaran: (id: string, suratEdaran: UploadFileRef, meetingContext?: UpdateAgendaDto) => Promise<Meeting | null>;
  createMeeting: (payload: CreateAgendaDto, suratEdaran?: UploadFileRef) => Promise<Meeting | null>;
  updateMeeting: (id: string, payload: UpdateAgendaDto, suratEdaran?: UploadFileRef) => Promise<Meeting | null>;
  deleteMeeting: (id: string) => Promise<{ success: boolean; message?: string }>;
  fetchAgendaFormOptions: () => Promise<void>; clearError: () => void;
}

function message(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [], dashboardMeetings: [], dashboardStats: null, activeMeeting: null,
  isLoading: false, isLoadingMore: false, error: null, filterTab: 'all', currentPage: 0, lastPage: 1, total: 0,
  isSavingMinutes: false,
  typeFilter: undefined, formOptions: null, isFormOptionsLoading: false,

  setFilterTab: (tab) => {
    set({ filterTab: tab });
    const status: AgendaFilters['status'] = tab === 'upcoming' ? 'scheduled' : tab === 'all' ? undefined : tab;
    set({ isLoading: true, error: null, dashboardMeetings: [] });
    void repository.getMeetings(1, { status }).then(({ meetings }) => set({ dashboardMeetings: meetings, activeMeeting: meetings.find((meeting) => meeting.status === 'ongoing') ?? null, isLoading: false })).catch((error) => set({ error: message(error, 'Gagal memuat agenda dashboard.'), isLoading: false }));
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null, dashboardStats: null });
    try {
      const result = await repository.getDashboard();
      set({ dashboardStats: result.stats, dashboardMeetings: result.agendas, activeMeeting: result.agendas.find((meeting) => meeting.status === 'ongoing') ?? null });
    } catch (error) { set({ error: message(error, 'Gagal memuat dashboard dari server.') }); }
    finally { set({ isLoading: false }); }
  },

  fetchMeetings: async (page = 1, append = false, requestedType) => {
    const typeFilter = requestedType === undefined ? get().typeFilter : requestedType === 'all' ? undefined : requestedType;
    if (append && (get().isLoadingMore || page > get().lastPage)) return;
    if (page === 1) set({ typeFilter });
    set(append ? { isLoadingMore: true, error: null } : { isLoading: true, error: null });
    try {
      const result = await repository.getMeetings(page, { type: typeFilter });
      set((state) => ({
        meetings: append ? [...state.meetings, ...result.meetings.filter((item) => !state.meetings.some((old) => old.id === item.id))] : result.meetings,
        currentPage: result.currentPage, lastPage: result.lastPage, total: result.total,
      }));
    } catch (error) { set({ error: message(error, 'Gagal memuat daftar agenda.') }); }
    finally { set(append ? { isLoadingMore: false } : { isLoading: false }); }
  },

  getMeetingById: async (id) => {
    const meeting = await repository.getMeetingById(id);
    if (!meeting) throw new Error('Agenda tidak ditemukan.');
    return meeting;
  },

  updateMinutes: async (id, minutes) => {
    set({ isSavingMinutes: true, error: null });
    try {
      const updated = await repository.updateMinutes(id, minutes);
      set((state) => ({
        meetings: state.meetings.map((item) => (item.id === id ? updated : item)),
        dashboardMeetings: state.dashboardMeetings.map((item) => (item.id === id ? updated : item)),
        activeMeeting: state.activeMeeting?.id === id ? updated : state.activeMeeting,
      }));
      return updated;
    } catch (error) {
      set({ error: message(error, 'Gagal menyimpan notulensi.') });
      return null;
    } finally { set({ isSavingMinutes: false }); }
  },

  uploadSuratEdaran: async (id, suratEdaran, meetingContext) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await repository.uploadSuratEdaran(id, suratEdaran, meetingContext);
      set((state) => ({
        meetings: state.meetings.map((item) => (item.id === id ? updated : item)),
        dashboardMeetings: state.dashboardMeetings.map((item) => (item.id === id ? updated : item)),
        activeMeeting: state.activeMeeting?.id === id ? updated : state.activeMeeting,
      }));
      return updated;
    } catch (error) {
      set({ error: message(error, 'Gagal mengunggah surat edaran.') });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  createMeeting: async (payload, suratEdaran) => {
    set({ isLoading: true, error: null });
    try {
      const created = await repository.createMeeting(payload, suratEdaran);
      set((state) => ({ meetings: [created, ...state.meetings.filter((item) => item.id !== created.id)], dashboardMeetings: [created, ...state.dashboardMeetings.filter((item) => item.id !== created.id)] }));
      try { await get().fetchMeetings(1, false, get().typeFilter ?? 'all'); } catch { /* create already succeeded */ }
      return created;
    } catch (error) { set({ error: message(error, 'Gagal membuat agenda.') }); return null; }
    finally { set({ isLoading: false }); }
  },

  updateMeeting: async (id, payload, suratEdaran) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await repository.updateMeeting(id, payload, suratEdaran);
      set((state) => ({
        meetings: state.meetings.map((item) => (item.id === id ? updated : item)),
        dashboardMeetings: state.dashboardMeetings.map((item) => (item.id === id ? updated : item)),
        activeMeeting: state.activeMeeting?.id === id ? updated : state.activeMeeting,
      }));
      return updated;
    } catch (error) {
      set({ error: message(error, 'Gagal memperbarui agenda rapat.') });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteMeeting: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await repository.deleteMeeting(id);
      set((state) => ({
        meetings: state.meetings.filter((item) => item.id !== id),
        dashboardMeetings: state.dashboardMeetings.filter((item) => item.id !== id),
        activeMeeting: state.activeMeeting?.id === id ? null : state.activeMeeting,
        total: Math.max(0, state.total - 1),
      }));
      return { success: true };
    } catch (error) {
      const errMsg = message(error, 'Gagal menghapus agenda rapat.');
      set({ error: errMsg });
      return { success: false, message: errMsg };
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAgendaFormOptions: async () => {
    set({ isFormOptionsLoading: true, error: null });
    try { set({ formOptions: await repository.getAgendaFormOptions() }); }
    catch (error) { set({ error: message(error, 'Gagal memuat pilihan pengguna dan unit.') }); }
    finally { set({ isFormOptionsLoading: false }); }
  },

  clearError: () => set({ error: null }),
}));
