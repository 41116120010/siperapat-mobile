import { create } from 'zustand';
import { Meeting, UserOption } from '../../domain/entities/types';
import { agendaApi, AgendaFilters, CreateAgendaDto, UpdateAgendaDto, UpdateMinutesDto, UploadFileRef } from '../../data/datasources/agendaApi';
import { ApiAgendaDto, ApiAgendaStatusCounts, ApiDashboardDto, ApiUnitDto, ApiUserDto } from '../../data/datasources/apiTypes';
import { toMeeting } from '../../data/mappers/apiMappers';
import { MeetingRepositoryImpl } from '../../data/repositories/MeetingRepositoryImpl';

const repository = new MeetingRepositoryImpl();
let candidatesInFlightKey: string | null = null;
type FilterTab = 'all' | 'ongoing' | 'upcoming' | 'completed';
export type AgendaStatusFilter = 'all' | 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type AgendaUnitFilter = 'all' | 'all_units' | number;
interface MeetingState {
  meetings: Meeting[]; dashboardMeetings: Meeting[]; dashboardStats: ApiDashboardDto['stats'] | null;
  activeMeeting: Meeting | null; isLoading: boolean; isLoadingMore: boolean; error: string | null;
  isSavingMinutes: boolean;
  filterTab: FilterTab; currentPage: number; lastPage: number; total: number; typeFilter: 'hybrid' | 'offline' | 'online' | undefined;
  statusFilter: AgendaStatusFilter;
  searchQuery: string;
  unitFilter: AgendaUnitFilter;
  statusCounts: ApiAgendaStatusCounts | null;
  agendaMetaById: Record<string, ApiAgendaDto>;
  formOptions: { users: ApiUserDto[]; units: ApiUnitDto[] } | null; isFormOptionsLoading: boolean;
  userCandidates: UserOption[]; userCandidatesTotal: number; isUserCandidatesLoading: boolean; userCandidatesError: string | null;
  setFilterTab: (tab: FilterTab) => void; fetchDashboard: () => Promise<void>;
  fetchMeetings: (
    page?: number,
    append?: boolean,
    typeFilter?: 'all' | 'hybrid' | 'offline' | 'online',
    extraFilters?: {
      status?: AgendaStatusFilter;
      search?: string;
      unitId?: AgendaUnitFilter;
    },
  ) => Promise<void>;
  getMeetingById: (id: string) => Promise<Meeting>;
  getMeetingDetailWithDto: (id: string) => Promise<{ meeting: Meeting; raw: ApiAgendaDto }>;
  updateMinutes: (id: string, minutes: UpdateMinutesDto) => Promise<Meeting | null>;
  uploadSuratEdaran: (id: string, suratEdaran: UploadFileRef, meetingContext?: UpdateAgendaDto) => Promise<Meeting | null>;
  createMeeting: (payload: CreateAgendaDto, suratEdaran?: UploadFileRef) => Promise<Meeting | null>;
  updateMeeting: (id: string, payload: UpdateAgendaDto, suratEdaran?: UploadFileRef) => Promise<Meeting | null>;
  deleteMeeting: (id: string) => Promise<{ success: boolean; message?: string }>;
  fetchUserCandidates: (filters?: { search?: string; unitId?: number }) => Promise<{ users: UserOption[]; total: number } | null>;
  fetchAgendaFormOptions: () => Promise<void>; clearError: () => void;
}

function message(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [], dashboardMeetings: [], dashboardStats: null, activeMeeting: null,
  isLoading: false, isLoadingMore: false, error: null, filterTab: 'all', currentPage: 0, lastPage: 1, total: 0,
  isSavingMinutes: false,
  typeFilter: undefined,
  statusFilter: 'all',
  searchQuery: '',
  unitFilter: 'all',
  statusCounts: null,
  agendaMetaById: {},
  formOptions: null, isFormOptionsLoading: false,
  userCandidates: [], userCandidatesTotal: 0, isUserCandidatesLoading: false, userCandidatesError: null,

  setFilterTab: (tab) => {
    set({ filterTab: tab });
    const status: AgendaFilters['status'] = tab === 'upcoming' ? 'scheduled' : tab === 'all' ? undefined : tab;
    set({ isLoading: true, error: null, dashboardMeetings: [] });
    void repository.getMeetings(1, { status }).then(({ meetings }) => set({ dashboardMeetings: meetings, activeMeeting: meetings.find((meeting) => meeting.status === 'ongoing') ?? null, isLoading: false })).catch((error) => set({ error: message(error, 'Gagal memuat agenda dashboard.'), isLoading: false }));
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await repository.getDashboard();
      set({ dashboardStats: result.stats, dashboardMeetings: result.agendas, activeMeeting: result.agendas.find((meeting) => meeting.status === 'ongoing') ?? null });
    } catch (error) { set({ error: message(error, 'Gagal memuat dashboard dari server.') }); }
    finally { set({ isLoading: false }); }
  },

  fetchMeetings: async (page = 1, append = false, requestedType, extraFilters) => {
    const typeFilter = requestedType === undefined ? get().typeFilter : requestedType === 'all' ? undefined : requestedType;
    const statusFilter = extraFilters?.status !== undefined ? extraFilters.status : get().statusFilter;
    const searchQuery = extraFilters?.search !== undefined ? extraFilters.search : get().searchQuery;
    const unitFilter = extraFilters?.unitId !== undefined ? extraFilters.unitId : get().unitFilter;
    if (append && (get().isLoadingMore || page > get().lastPage)) return;
    if (page === 1) set({ typeFilter, statusFilter, searchQuery, unitFilter });
    set(append ? { isLoadingMore: true, error: null } : { isLoading: true, error: null });
    try {
      const response = await agendaApi.list(page, 10, {
        type: typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
        unitId: unitFilter === 'all' ? undefined : unitFilter,
      });
      const mapped = response.data.map(toMeeting);
      const nextMeta: Record<string, ApiAgendaDto> = append ? { ...get().agendaMetaById } : {};
      response.data.forEach((dto) => {
        nextMeta[String(dto.id)] = dto;
      });
      set((state) => ({
        meetings: append ? [...state.meetings, ...mapped.filter((item) => !state.meetings.some((old) => old.id === item.id))] : mapped,
        currentPage: response.meta.current_page,
        lastPage: response.meta.last_page,
        total: response.meta.total,
        statusCounts: response.summary?.status_counts ?? state.statusCounts,
        agendaMetaById: nextMeta,
      }));
    } catch (error) { set({ error: message(error, 'Gagal memuat daftar agenda.') }); }
    finally { set(append ? { isLoadingMore: false } : { isLoading: false }); }
  },

  getMeetingById: async (id) => {
    const meeting = await repository.getMeetingById(id);
    if (!meeting) throw new Error('Agenda tidak ditemukan.');
    return meeting;
  },

  getMeetingDetailWithDto: async (id) => {
    const response = await agendaApi.detail(id);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Agenda tidak ditemukan.');
    }
    const meeting = toMeeting(response.data);
    set((state) => ({
      agendaMetaById: { ...state.agendaMetaById, [String(response.data.id)]: response.data },
    }));
    return { meeting, raw: response.data };
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

  fetchUserCandidates: async (filters = {}) => {
    const search = filters.search?.trim() || undefined;
    const requestKey = `${search ?? ''}|${filters.unitId ?? ''}`;
    if (candidatesInFlightKey === requestKey) {
      return { users: get().userCandidates, total: get().userCandidatesTotal };
    }
    candidatesInFlightKey = requestKey;
    set({ isUserCandidatesLoading: true, userCandidatesError: null });
    try {
      const result = await repository.getUserCandidates({ search, unitId: filters.unitId });
      set({ userCandidates: result.users, userCandidatesTotal: result.total });
      return result;
    } catch (error) {
      const errMsg = message(error, 'Gagal memuat kandidat pegawai.');
      set({ userCandidatesError: errMsg, userCandidates: [], userCandidatesTotal: 0 });
      return null;
    } finally {
      candidatesInFlightKey = null;
      set({ isUserCandidatesLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
